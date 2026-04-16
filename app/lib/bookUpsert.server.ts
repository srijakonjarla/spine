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

  if (catalog.isbn) {
    const { data: existing } = await supabase
      .from("catalog_books")
      .select("id")
      .eq("isbn", catalog.isbn)
      .maybeSingle();

    if (existing) {
      catalogBookId = existing.id;
      // Opportunistically fill in missing catalog fields without overwriting good data
      const patch: Record<string, unknown> = {};
      if (catalog.cover_url) patch.cover_url = catalog.cover_url;
      if (catalog.genres?.length) patch.genres = catalog.genres;
      if (catalog.page_count != null) patch.page_count = catalog.page_count;
      if (catalog.release_date) patch.release_date = catalog.release_date;
      if (Object.keys(patch).length) {
        patch.updated_at = new Date().toISOString();
        await supabase
          .from("catalog_books")
          .update(patch)
          .eq("id", catalogBookId)
          .eq("cover_url", "");
        // Only update cover_url when it was empty — don't downgrade a good cover
        if (!patch.cover_url) delete patch.cover_url;
        if (Object.keys(patch).length > 1) {
          // still has other fields
          await supabase
            .from("catalog_books")
            .update(patch)
            .eq("id", catalogBookId);
        }
      }
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

  // ── 2. Create the user_books entry ────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: userBook, error: ubErr } = await supabase
    .from("user_books")
    .insert({
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
      bookmarked: personal.bookmarked ?? false,
      created_at: personal.created_at ?? now,
      updated_at: personal.updated_at ?? now,
    })
    .select("id")
    .single();

  if (ubErr || !userBook) return null;
  return { userBookId: userBook.id, catalogBookId: catalogBookId! };
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
    created_at: row.created_at,
    updated_at: row.updated_at,
    thoughts: row.thoughts ?? [],
    book_reads: row.book_reads ?? [],
  };
}
