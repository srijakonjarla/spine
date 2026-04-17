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
  release_date: string;
  genres: string[];
  page_count: number | null;
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

  const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (catalog.isbn) {
    const { data: existing } = await supabase
      .from("catalog_books")
      .select("id, title, cover_url")
      .eq("isbn", catalog.isbn)
      .maybeSingle();

    if (existing) {
      // Validate title matches — guards against bad ISBN data from catalog sources
      // (e.g. a source returning Vol 6's ISBN for Vol 4). We accept the match only
      // if one normalized title is a prefix of the other, which handles subtitle
      // variations ("The Duke and I" ↔ "The Duke and I (Bridgertons #1)") while
      // correctly rejecting distinct volumes ("Volume Four" ≠ "Volume Six").
      const inNorm = normTitle(catalog.title);
      const exNorm = normTitle(existing.title ?? "");
      const titleMatches =
        !inNorm ||
        !exNorm ||
        inNorm === exNorm ||
        inNorm.startsWith(exNorm) ||
        exNorm.startsWith(inNorm);

      if (titleMatches) {
        catalogBookId = existing.id;
        const patch: Record<string, unknown> = {};

        // Update title if the incoming one is longer/richer (e.g. Hardcover adds
        // series suffix that Goodreads omits) or if the existing title is empty.
        if (
          catalog.title &&
          catalog.title !== existing.title &&
          (
            !existing.title ||
            catalog.title.toLowerCase().startsWith(existing.title.toLowerCase())
          )
        ) {
          patch.title = catalog.title;
        }

        if (catalog.cover_url && !existing.cover_url) patch.cover_url = catalog.cover_url;
        if (catalog.genres?.length) patch.genres = catalog.genres;
        if (catalog.page_count != null) patch.page_count = catalog.page_count;
        if (catalog.release_date) patch.release_date = catalog.release_date;

        if (Object.keys(patch).length) {
          patch.updated_at = new Date().toISOString();
          await supabase
            .from("catalog_books")
            .update(patch)
            .eq("id", catalogBookId);
        }
      }
      // else: ISBN matched the wrong book — fall through and create/find by title
    }
  }

  // When no ISBN (or ISBN matched the wrong book), deduplicate by title + author
  if (!catalogBookId && catalog.title) {
    const { data: byTitle } = await supabase
      .from("catalog_books")
      .select("id")
      .ilike("title", catalog.title)
      .eq("author", catalog.author)
      .maybeSingle();
    if (byTitle) catalogBookId = byTitle.id;
  }

  if (!catalogBookId) {
    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from("catalog_books")
      .insert({
        title: catalog.title,
        author: catalog.author,
        cover_url: catalog.cover_url,
        isbn: catalog.isbn,
        release_date: catalog.release_date,
        genres: catalog.genres,
        page_count: catalog.page_count,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error || !created) return null;
    catalogBookId = created.id;
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
  date_started: string | null;
  date_finished: string | null;
  date_shelved: string | null;
  rating: number;
  feeling: string;
  mood_tags: string[];
  bookmarked: boolean;
  up_next: boolean;
  created_at: string;
  updated_at: string;
  catalog_books: {
    title: string;
    author: string;
    cover_url: string;
    isbn: string;
    release_date: string;
    genres: string[];
    page_count: number | null;
  } | null;
  thoughts?: unknown[];
  book_reads?: unknown[];
}) {
  const cb = row.catalog_books ?? {
    title: "",
    author: "",
    cover_url: "",
    isbn: "",
    release_date: "",
    genres: [],
    page_count: null,
  };
  return {
    id: row.id,
    catalogBookId: row.catalog_book_id,
    user_id: row.user_id,
    title: row.title_override ?? cb.title ?? "",
    author: row.author_override ?? cb.author ?? "",
    release_date: cb.release_date ?? "",
    genres: cb.genres ?? [],
    cover_url: cb.cover_url ?? "",
    isbn: cb.isbn ?? "",
    page_count: cb.page_count ?? null,
    status: row.status,
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
