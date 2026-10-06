/**
 * Server-only helpers for the two-table catalog_books / user_books schema.
 *
 * catalog_books: shared Hardcover cache (see catalogStore.server.ts).
 * user_books:    one row per (user, book) — reading state plus per-user
 *                overrides (title, author, cover, page count) that shadow
 *                the shared catalog values.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookEntry } from "@spine/shared";
import { normalizeMoodTags } from "@/lib/moodTags";
import {
  type CatalogFields,
  resolveCatalogBook,
} from "@/lib/catalogStore.server";

export const USER_BOOK_COLUMNS =
  "id, user_id, catalog_book_id, title_override, author_override, " +
  "cover_url_override, page_count_override, status, format, diversity_tags, " +
  "date_started, date_finished, date_shelved, date_dnfed, rating, feeling, " +
  "mood_tags, user_genres, bookmarked, up_next, created_at, updated_at";
export const CATALOG_COLUMNS =
  "hardcover_book_id, title, author, publisher, cover_url, isbns, " +
  "release_date, genres, page_count, audio_duration_minutes";

export interface PersonalFields {
  /** If provided the user_books row gets this specific UUID (import/goodreads path) */
  id?: string;
  status: string;
  date_started?: string | null;
  date_finished?: string | null;
  date_shelved?: string | null;
  date_dnfed?: string | null;
  rating?: number;
  feeling?: string;
  mood_tags?: string[];
  bookshelves?: string[];
  bookmarked?: boolean;
  diversity_tags?: string[];
  created_at?: string;
  updated_at?: string;
}

/** Catalog fields as submitted by a client — unverified until resolved. */
export function catalogFieldsFromEntry(entry: BookEntry): CatalogFields {
  return {
    hardcover_book_id: entry.hardcoverBookId ?? null,
    title: entry.title ?? "",
    author: entry.author ?? "",
    cover_url: entry.coverUrl ?? "",
    isbns: entry.isbn ? [entry.isbn] : [],
    release_date: entry.releaseDate ?? "",
    genres: entry.genres ?? [],
    page_count: entry.pageCount ?? null,
    publisher: entry.publisher ?? "",
    audio_duration_minutes: entry.audioDurationMinutes ?? null,
  };
}

export function personalFieldsFromEntry(entry: BookEntry): PersonalFields {
  return {
    id: entry.id,
    status: entry.status,
    date_started: entry.dateStarted || null,
    date_finished: entry.dateFinished || null,
    date_shelved: entry.dateShelved || null,
    date_dnfed: entry.dateDnfed || null,
    rating: entry.rating ?? 0,
    feeling: entry.feeling ?? "",
    bookmarked: false,
    diversity_tags: entry.diversityTags ?? [],
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

/**
 * Resolves the catalog row (see `resolveCatalogBook`) and inserts a
 * user_books row linking the user to it. `supabase` is used only for the
 * user_books write, so callers pass the user's client and RLS applies.
 *
 * `alreadyExists` is true when the user already had a row for this book —
 * that row is returned as-is (its status is NOT changed), since
 * (user_id, catalog_book_id) is unique.
 */
export async function upsertBookForUser(
  supabase: SupabaseClient,
  userId: string,
  catalog: CatalogFields,
  personal: PersonalFields,
  opts: { verified: boolean },
): Promise<{
  userBookId: string;
  catalogBookId: string;
  alreadyExists: boolean;
  existingStatus: string | null;
} | null> {
  const catalogBookId = await resolveCatalogBook(catalog, opts);
  if (!catalogBookId) return null;

  // ON CONFLICT DO NOTHING: a DO UPDATE would try to rewrite the primary key
  // of the existing row and violate the series_books FK.
  const now = new Date().toISOString();
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
        date_dnfed: personal.date_dnfed ?? null,
        rating: personal.rating ?? 0,
        feeling: personal.feeling ?? "",
        mood_tags: normalizeMoodTags(personal.mood_tags ?? []),
        bookshelves: personal.bookshelves ?? [],
        bookmarked: personal.bookmarked ?? false,
        diversity_tags: personal.diversity_tags ?? [],
        created_at: personal.created_at ?? now,
        updated_at: personal.updated_at ?? now,
      },
      { onConflict: "user_id,catalog_book_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (inserted)
    return {
      userBookId: inserted.id,
      catalogBookId,
      alreadyExists: false,
      existingStatus: null,
    };

  const { data: existing } = await supabase
    .from("user_books")
    .select("id, status")
    .eq("user_id", userId)
    .eq("catalog_book_id", catalogBookId)
    .single();
  if (!existing) return null;
  return {
    userBookId: existing.id,
    catalogBookId,
    alreadyExists: true,
    existingStatus: existing.status,
  };
}

/**
 * Flatten a user_books row (with catalog_books joined) into the flat shape
 * the rest of the app expects, applying the per-user overrides.
 */
export function flattenUserBook(row: {
  id: string;
  user_id: string;
  catalog_book_id: string;
  title_override: string | null;
  author_override: string | null;
  cover_url_override: string | null;
  page_count_override: number | null;
  status: string;
  format: string;
  diversity_tags: string[];
  date_started: string | null;
  date_finished: string | null;
  date_shelved: string | null;
  date_dnfed: string | null;
  rating: number;
  feeling: string;
  mood_tags: string[];
  user_genres: string[];
  bookmarked: boolean;
  up_next: boolean;
  created_at: string;
  updated_at: string;
  catalog_books: {
    hardcover_book_id: number | null;
    title: string;
    author: string;
    publisher: string;
    cover_url: string;
    isbns: string[] | null;
    release_date: string;
    genres: string[];
    page_count: number | null;
    audio_duration_minutes: number | null;
  } | null;
  thoughts?: unknown[];
  book_reads?: unknown[];
}) {
  const cb = row.catalog_books;
  return {
    id: row.id,
    catalog_book_id: row.catalog_book_id,
    hardcover_book_id: cb?.hardcover_book_id ?? null,
    user_id: row.user_id,
    title: row.title_override ?? cb?.title ?? "",
    author: row.author_override ?? cb?.author ?? "",
    publisher: cb?.publisher ?? "",
    release_date: cb?.release_date ?? "",
    genres: [...new Set([...(cb?.genres ?? []), ...(row.user_genres ?? [])])],
    user_genres: row.user_genres ?? [],
    diversity_tags: row.diversity_tags ?? [],
    user_diversity_tags: row.diversity_tags ?? [],
    cover_url: row.cover_url_override ?? cb?.cover_url ?? "",
    isbn: cb?.isbns?.[0] ?? "",
    isbns: cb?.isbns ?? [],
    page_count: row.page_count_override ?? cb?.page_count ?? null,
    audio_duration_minutes: cb?.audio_duration_minutes ?? null,
    status: row.status,
    format: row.format ?? "",
    date_started: row.date_started,
    date_finished: row.date_finished,
    date_shelved: row.date_shelved,
    date_dnfed: row.date_dnfed,
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

/**
 * Maps a client PATCH onto user_books columns. Catalog-level fields the user
 * edits (cover, page count) become per-user overrides; the shared catalog is
 * never written from here.
 */
export function userBookPatchFromEntry(
  patch: Partial<BookEntry>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("status" in patch) row.status = patch.status;
  if ("dateStarted" in patch) row.date_started = patch.dateStarted || null;
  if ("dateFinished" in patch) row.date_finished = patch.dateFinished || null;
  if ("dateShelved" in patch) row.date_shelved = patch.dateShelved || null;
  if ("dateDnfed" in patch) row.date_dnfed = patch.dateDnfed || null;
  if ("rating" in patch) row.rating = patch.rating;
  if ("feeling" in patch) row.feeling = patch.feeling;
  if ("bookmarked" in patch) row.bookmarked = patch.bookmarked;
  if ("upNext" in patch) row.up_next = patch.upNext;
  if ("moodTags" in patch)
    row.mood_tags = normalizeMoodTags(patch.moodTags ?? []);
  if ("diversityTags" in patch) row.diversity_tags = patch.diversityTags;
  if ("bookshelves" in patch) row.bookshelves = patch.bookshelves;
  if ("userGenres" in patch) row.user_genres = patch.userGenres;
  if ("format" in patch) row.format = patch.format;
  if ("title" in patch) row.title_override = patch.title || null;
  if ("author" in patch) row.author_override = patch.author || null;
  if ("coverUrl" in patch) row.cover_url_override = patch.coverUrl || null;
  if ("pageCount" in patch) row.page_count_override = patch.pageCount ?? null;
  return row;
}
