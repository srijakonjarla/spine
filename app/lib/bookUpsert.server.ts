/**
 * Server-only helpers for writing to the two-table catalog_books / user_books schema.
 *
 * Catalog fields  (shared, ISBN-deduplicated): title, author, cover_url, isbn,
 *                  release_date, genres, page_count.
 * Personal fields (per-user):  status, dates, rating, feeling, mood_tags,
 *                  bookmarked, title_override, author_override.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CatalogFields {
  title: string;
  author: string;
  cover_url: string;
  isbn: string;
  /** All known edition ISBNs for this book (isbn_10 and isbn_13 across editions). */
  isbns?: string[];
  release_date: string;
  genres: string[];
  page_count: number | null;
  publisher?: string;
  audio_duration_minutes?: number | null;
  diversity_tags?: string[];
}

export interface PersonalFields {
  /** If provided the user_books row gets this specific UUID (import/goodreads path) */
  id?: string;
  status: string;
  date_started?: string | null;
  date_finished?: string | null;
  date_shelved?: string | null;
  rating?: number;
  feeling?: string;
  mood_tags?: string[];
  bookshelves?: string[];
  bookmarked?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Upserts a catalog_books entry (deduped by isbn when non-empty) and inserts a
 * user_books row linking the user to it.
 *
 * Returns { userBookId, catalogBookId } or null on failure.
 */
export async function upsertBookForUser(
  supabase: SupabaseClient,
  userId: string,
  catalog: CatalogFields,
  personal: PersonalFields,
): Promise<{ userBookId: string; catalogBookId: string } | null> {
  // ── 1. Resolve or create the catalog_books entry ──────────────────────────
  let catalogBookId: string | null = null;
  // Fallback: if ISBN lookup finds a row but title doesn't match, we keep the
  // ISBN-matched ID here. Used as a last resort if title+author lookup and INSERT
  // both fail (INSERT fails when the ISBN unique constraint is violated).
  let isbnFallbackId: string | null = null;

  const allIncomingIsbns = [
    ...new Set([...(catalog.isbns ?? []), catalog.isbn].filter(Boolean)),
  ];

  type ExistingRow = {
    id: string;
    title?: string | null;
    cover_url?: string | null;
    isbns?: string[] | null;
  };

  // Enrich an existing catalog_books row with incoming data. Fills empty cover,
  // overwrites scalar fields when provided, and merges newly discovered ISBNs.
  // allowTitleUpdate is only set on the ISBN path (title was verified match).
  const applyEnrichPatch = async (
    existing: ExistingRow,
    opts: { allowTitleUpdate?: boolean } = {},
  ) => {
    const patch: Record<string, unknown> = {};

    if (
      opts.allowTitleUpdate &&
      catalog.title &&
      catalog.title !== existing.title &&
      (!existing.title ||
        catalog.title
          .toLowerCase()
          .startsWith((existing.title ?? "").toLowerCase()))
    ) {
      patch.title = catalog.title;
    }

    const storedIsbns = existing.isbns ?? [];
    const mergedIsbns = [...new Set([...storedIsbns, ...allIncomingIsbns])];
    if (mergedIsbns.length > storedIsbns.length) patch.isbns = mergedIsbns;

    if (catalog.cover_url && !existing.cover_url)
      patch.cover_url = catalog.cover_url;
    if (catalog.genres?.length) patch.genres = catalog.genres;
    if (catalog.page_count != null) patch.page_count = catalog.page_count;
    if (catalog.release_date) patch.release_date = catalog.release_date;
    if (catalog.publisher) patch.publisher = catalog.publisher;
    if (catalog.audio_duration_minutes != null)
      patch.audio_duration_minutes = catalog.audio_duration_minutes;
    if (catalog.diversity_tags?.length)
      patch.diversity_tags = catalog.diversity_tags;

    if (Object.keys(patch).length) {
      patch.updated_at = new Date().toISOString();
      await supabase.from("catalog_books").update(patch).eq("id", existing.id);
    }
  };

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Strip series suffix, subtitle, and trailing author pollution so variant
  // titles collapse to a shared canonical form for matching.
  const stripTitle = (title: string): string => {
    // Normalize common abbreviations before stripping so volume numbers stay intact:
    // "Saga, Vol. 1" and "Saga, Volume 1" both become "Saga, Volume 1".
    let t = title.trim().replace(/\bvol\.?\b/gi, "Volume");
    // Trailing parenthetical: "(Series #1)", "(Heiress Heists 1)", "(A Reese's Book Club Pick)"
    t = t.replace(/\s*\([^)]*\)\s*$/, "");
    // Subtitle after colon: ": The Saga of an American Family"
    t = t.replace(/\s*:\s*.+$/, "");
    // Trailing " by FirstName LastName" — capitalized name
    t = t.replace(/\s+by\s+[A-Z][\w.'\-]+(?:\s+[\w.'\-]+)*$/, "");
    // Trailing ", FirstName LastName" — two+ capitalized words (author-name pollution)
    t = t.replace(/,\s+[A-Z][\w.'\-]+(?:\s+[A-Z][\w.'\-]+)+\s*$/, "");
    return t.trim();
  };

  // Normalized comparison form: strip to canonical + alphanumeric lowercase.
  const titleKey = (s: string) => norm(stripTitle(s));

  if (catalog.isbn) {
    const { data: existing } = await supabase
      .from("catalog_books")
      .select("id, title, cover_url, isbns")
      .contains("isbns", [catalog.isbn])
      .maybeSingle();

    if (existing) {
      // Validate title matches — guards against bad ISBN data from catalog sources
      // (e.g. a source returning Vol 6's ISBN for Vol 4). We accept the match only
      // if one normalized title is a prefix of the other, which handles subtitle
      // variations ("The Duke and I" ↔ "The Duke and I (Bridgertons #1)") while
      // correctly rejecting distinct volumes ("Volume Four" ≠ "Volume Six").
      const inNorm = norm(catalog.title);
      const exNorm = norm(existing.title ?? "");
      const titleMatches =
        !inNorm ||
        !exNorm ||
        inNorm === exNorm ||
        inNorm.startsWith(exNorm) ||
        exNorm.startsWith(inNorm);

      if (titleMatches) {
        catalogBookId = existing.id;
        await applyEnrichPatch(existing, { allowTitleUpdate: true });
      } else {
        // ISBN matched a row but title suggests it's a different book (e.g. bad ISBN
        // data). Save the match as a fallback — if title+author lookup and INSERT
        // both fail (INSERT hits the ISBN unique constraint), we'll use this row
        // rather than silently dropping the book.
        isbnFallbackId = existing.id;
      }
    }
  }

  // When no ISBN (or ISBN matched the wrong book), deduplicate by title + author.
  // Query uses stripped-title prefix so "Lovelight Farms%" matches both
  // "Lovelight Farms" and "Lovelight Farms (Lovelight, #1)". JS-side match
  // compares stripped+normalized titles bidirectionally to catch the reverse
  // case (stored is the shorter form, e.g. "Roots" vs "Roots: The Saga…").
  if (!catalogBookId && catalog.title) {
    const baseTitle = stripTitle(catalog.title);
    // Apostrophe becomes _ so straight/curly variants both match via ilike.
    const ilikePattern = baseTitle
      .replace(/[%_\\]/g, "\\$&")
      .replace(/['']/g, "_");
    // Also fetch candidates shorter than baseTitle (stored is the shorter form).
    // Use the first word of baseTitle as a loose prefix — author filter narrows it.
    const firstWord = baseTitle.split(/\s+/)[0] ?? "";
    const { data: prefixCandidates } = await supabase
      .from("catalog_books")
      .select("id, title, author, isbns, cover_url")
      .ilike("title", `${ilikePattern}%`)
      .limit(20);
    const { data: shortCandidates } = firstWord
      ? await supabase
          .from("catalog_books")
          .select("id, title, author, isbns, cover_url")
          .ilike("title", `${firstWord}%`)
          .limit(20)
      : { data: [] };

    const seen = new Set<string>();
    const candidates = [
      ...(prefixCandidates ?? []),
      ...(shortCandidates ?? []),
    ].filter((c) => !seen.has(c.id) && seen.add(c.id));

    const inKey = titleKey(catalog.title);
    const inAuthor = norm(catalog.author);
    const byTitle = candidates.find((c) => {
      const cKey = titleKey(c.title ?? "");
      const titleOk =
        !inKey ||
        !cKey ||
        cKey === inKey ||
        cKey.startsWith(inKey) ||
        inKey.startsWith(cKey);
      if (!titleOk) return false;
      if (!catalog.author) return true;
      const stAuthor = norm(c.author ?? "");
      return (
        !stAuthor ||
        stAuthor === inAuthor ||
        stAuthor.includes(inAuthor) ||
        inAuthor.includes(stAuthor)
      );
    });

    if (byTitle) {
      catalogBookId = byTitle.id;
      await applyEnrichPatch(byTitle);
    }
  }

  if (!catalogBookId) {
    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from("catalog_books")
      .insert({
        title: catalog.title,
        author: catalog.author,
        cover_url: catalog.cover_url,
        isbns: allIncomingIsbns,
        release_date: catalog.release_date,
        genres: catalog.genres,
        page_count: catalog.page_count,
        publisher: catalog.publisher ?? "",
        audio_duration_minutes: catalog.audio_duration_minutes ?? null,
        diversity_tags: catalog.diversity_tags ?? [],
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error || !created) {
      // INSERT failed — most likely a unique ISBN constraint violation from a
      // concurrent import or a title-mismatch false-negative on the ISBN lookup.
      // Fall back to the ISBN-matched row we found earlier if available.
      if (isbnFallbackId) {
        catalogBookId = isbnFallbackId;
      } else {
        return null;
      }
    } else {
      catalogBookId = created.id;
    }
  }

  // ── 2. Insert or fetch the user_books entry ──────────────────────────────
  // Use ignoreDuplicates: true (ON CONFLICT DO NOTHING) to avoid the upsert
  // generating "DO UPDATE SET id = EXCLUDED.id" which would try to change the
  // primary key of an existing row and violate the series_books FK.
  // If no row is returned (conflict), fetch the existing row instead.
  const now = new Date().toISOString();
  let userBookId: string | null = null;

  const { data: inserted } = await supabase
    .from("user_books")
    .upsert(
      {
        ...(personal.id ? { id: personal.id } : {}),
        user_id: userId,
        catalog_book_id: catalogBookId,
        status: personal.status,
        date_started: personal.date_started ?? null,
        date_finished: personal.date_finished ?? null,
        date_shelved: personal.date_shelved ?? null,
        rating: personal.rating ?? 0,
        feeling: personal.feeling ?? "",
        mood_tags: personal.mood_tags ?? [],
        bookshelves: personal.bookshelves ?? [],
        bookmarked: personal.bookmarked ?? false,
        created_at: personal.created_at ?? now,
        updated_at: personal.updated_at ?? now,
      },
      { onConflict: "user_id,catalog_book_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (inserted) {
    userBookId = inserted.id;
  } else {
    // Row already existed — fetch it
    const { data: existing } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", userId)
      .eq("catalog_book_id", catalogBookId!)
      .single();
    if (!existing) return null;
    userBookId = existing.id;
  }

  return { userBookId: userBookId!, catalogBookId: catalogBookId! };
}

/**
 * Flatten a user_books row (with catalog_books joined) into the flat shape
 * the rest of the app expects. Applies title_override / author_override.
 */
export function flattenUserBook(row: {
  id: string;
  user_id: string;
  catalog_book_id: string;
  title_override: string | null;
  author_override: string | null;
  status: string;
  format: string;
  diversity_tags: string[];
  date_started: string | null;
  date_finished: string | null;
  date_shelved: string | null;
  rating: number;
  feeling: string;
  mood_tags: string[];
  user_genres: string[];
  bookmarked: boolean;
  up_next: boolean;
  created_at: string;
  updated_at: string;
  catalog_books: {
    title: string;
    author: string;
    publisher: string;
    cover_url: string;
    isbns: string[] | null;
    release_date: string;
    genres: string[];
    diversity_tags: string[];
    page_count: number | null;
    audio_duration_minutes: number | null;
  } | null;
  thoughts?: unknown[];
  book_reads?: unknown[];
}) {
  const cb = row.catalog_books ?? {
    title: "",
    author: "",
    publisher: "",
    cover_url: "",
    isbns: [] as string[],
    release_date: "",
    genres: [],
    diversity_tags: [],
    page_count: null,
    audio_duration_minutes: null,
  };
  return {
    id: row.id,
    catalogBookId: row.catalog_book_id,
    user_id: row.user_id,
    title: row.title_override ?? cb.title ?? "",
    author: row.author_override ?? cb.author ?? "",
    publisher: cb.publisher ?? "",
    release_date: cb.release_date ?? "",
    genres: [...new Set([...(cb.genres ?? []), ...(row.user_genres ?? [])])],
    user_genres: row.user_genres ?? [],
    diversity_tags: [
      ...new Set([...(cb.diversity_tags ?? []), ...(row.diversity_tags ?? [])]),
    ],
    user_diversity_tags: row.diversity_tags ?? [],
    cover_url: cb.cover_url ?? "",
    isbn: cb.isbns?.[0] ?? "",
    isbns: cb.isbns ?? [],
    page_count: cb.page_count ?? null,
    audio_duration_minutes: cb.audio_duration_minutes ?? null,
    status: row.status,
    format: row.format ?? "",
    date_started: row.date_started,
    date_finished: row.date_finished,
    date_shelved: row.date_shelved,
    rating: row.rating,
    feeling: row.feeling,
    mood_tags: row.mood_tags ?? [],
    bookmarked: row.bookmarked ?? false,
    up_next: row.up_next ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    thoughts: row.thoughts ?? [],
    book_reads: row.book_reads ?? [],
  };
}
