/**
 * The shared `catalog_books` table is a server-maintained cache of Hardcover.
 * Every write to it goes through this module using the service-role client;
 * end-user JWTs can only read it. Identity is `hardcover_book_id` — fuzzy
 * ISBN/title matching is only a fallback for rows not yet linked to Hardcover
 * (legacy rows, Google Books results, manual entries).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase-server";
import {
  type HCBook,
  fetchBookById,
  normTitle,
  stripTitle,
} from "@/lib/hardcover.server";

export interface CatalogFields {
  hardcover_book_id: number | null;
  title: string;
  author: string;
  cover_url: string;
  /** Every known edition ISBN (isbn_13 and isbn_10). */
  isbns: string[];
  release_date: string;
  genres: string[];
  page_count: number | null;
  publisher: string;
  audio_duration_minutes: number | null;
}

export function catalogFieldsFromHardcover(b: HCBook): CatalogFields {
  return {
    hardcover_book_id: b.hardcoverBookId,
    title: b.title,
    author: b.author,
    cover_url: b.coverUrl,
    isbns: [...new Set([b.isbn, ...b.isbns].filter(Boolean))],
    release_date: b.releaseDate,
    genres: b.genres,
    page_count: b.pageCount,
    publisher: b.publisher,
    audio_duration_minutes: b.audioDurationMinutes,
  };
}

/**
 * Patch that refreshes a catalog row from Hardcover-verified fields. Title and
 * author are left alone (they drive matching and display), cover is only
 * filled when empty (Hardcover's default edition is often not the one people
 * recognise), ISBNs are merged, and everything else is overwritten.
 */
export function hardcoverRefreshPatch(
  existing: { cover_url?: string | null; isbns?: string[] | null },
  f: CatalogFields,
): Record<string, unknown> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    hardcover_book_id: f.hardcover_book_id,
    synced_at: now,
    updated_at: now,
  };
  const stored = existing.isbns ?? [];
  const merged = [...new Set([...stored, ...f.isbns])];
  if (merged.length > stored.length) patch.isbns = merged;
  if (f.cover_url && !existing.cover_url) patch.cover_url = f.cover_url;
  if (f.genres.length) patch.genres = f.genres;
  if (f.page_count != null) patch.page_count = f.page_count;
  if (f.release_date) patch.release_date = f.release_date;
  if (f.publisher) patch.publisher = f.publisher;
  if (f.audio_duration_minutes != null)
    patch.audio_duration_minutes = f.audio_duration_minutes;
  return patch;
}

type MatchRow = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  isbns: string[] | null;
  hardcover_book_id: number | null;
};
const MATCH_COLUMNS = "id, title, author, cover_url, isbns, hardcover_book_id";

/**
 * Fuzzy match against existing rows by ISBN, then stripped title + author.
 * When `onlyUnlinked` is set, rows already linked to a Hardcover id are
 * skipped — a row with a different Hardcover id is by definition another book.
 */
export async function findFuzzyMatch(
  admin: SupabaseClient,
  f: Pick<CatalogFields, "title" | "author" | "isbns">,
  onlyUnlinked: boolean,
): Promise<MatchRow | null> {
  const eligible = (r: MatchRow) =>
    !onlyUnlinked || r.hardcover_book_id == null;
  const inNorm = normTitle(f.title);

  for (const isbn of f.isbns.slice(0, 3)) {
    const { data } = await admin
      .from("catalog_books")
      .select(MATCH_COLUMNS)
      .contains("isbns", [isbn])
      .limit(5);
    // Title must also agree — guards against bad ISBN data from sources
    // (e.g. a source returning Vol 6's ISBN for Vol 4).
    const hit = ((data ?? []) as MatchRow[]).find((r) => {
      if (!eligible(r)) return false;
      const ex = normTitle(r.title ?? "");
      return (
        !inNorm ||
        !ex ||
        inNorm === ex ||
        inNorm.startsWith(ex) ||
        ex.startsWith(inNorm)
      );
    });
    if (hit) return hit;
  }

  if (!f.title) return null;
  // Prefix query on the stripped title catches "Title (Series #1)" variants;
  // the first-word query catches the reverse (stored row is the shorter form).
  const baseTitle = stripTitle(f.title);
  const ilikePattern = baseTitle
    .replace(/[%_\\]/g, "\\$&")
    .replace(/['']/g, "_");
  const firstWord = (baseTitle.split(/\s+/)[0] ?? "").replace(
    /[%_\\]/g,
    "\\$&",
  );
  const [prefix, short] = await Promise.all([
    admin
      .from("catalog_books")
      .select(MATCH_COLUMNS)
      .ilike("title", `${ilikePattern}%`)
      .limit(20),
    firstWord
      ? admin
          .from("catalog_books")
          .select(MATCH_COLUMNS)
          .ilike("title", `${firstWord}%`)
          .limit(20)
      : Promise.resolve({ data: [] as MatchRow[] }),
  ]);

  const key = (s: string) => normTitle(stripTitle(s));
  const inKey = key(f.title);
  const inAuthor = normTitle(f.author);
  const seen = new Set<string>();
  return (
    [
      ...((prefix.data ?? []) as MatchRow[]),
      ...((short.data ?? []) as MatchRow[]),
    ]
      .filter((r) => !seen.has(r.id) && seen.add(r.id))
      .filter(eligible)
      .find((r) => {
        const cKey = key(r.title ?? "");
        const titleOk =
          !inKey ||
          !cKey ||
          cKey === inKey ||
          cKey.startsWith(inKey) ||
          inKey.startsWith(cKey);
        if (!titleOk) return false;
        if (!inAuthor) return true;
        const stAuthor = normTitle(r.author ?? "");
        return (
          !stAuthor ||
          stAuthor === inAuthor ||
          stAuthor.includes(inAuthor) ||
          inAuthor.includes(stAuthor)
        );
      }) ?? null
  );
}

async function findByHardcoverId(
  admin: SupabaseClient,
  id: number,
): Promise<string | null> {
  const { data } = await admin
    .from("catalog_books")
    .select("id")
    .eq("hardcover_book_id", id)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Returns the catalog_books id for a book, creating or linking the row as
 * needed.
 *
 * `verified: false` means the fields came from a client: a claimed
 * `hardcover_book_id` is re-fetched from Hardcover and its data replaces the
 * client's; if Hardcover can't confirm it, the id is dropped and the book is
 * stored as an unlinked row for catalog sync to resolve later. Unlinked input
 * never mutates an existing row.
 */
export async function resolveCatalogBook(
  input: CatalogFields,
  opts: { verified: boolean },
): Promise<string | null> {
  const admin = createAdminClient();
  let f = input;

  if (f.hardcover_book_id != null) {
    const existingId = await findByHardcoverId(admin, f.hardcover_book_id);
    if (existingId) return existingId;
    if (!opts.verified) {
      const hc = await fetchBookById(f.hardcover_book_id);
      f = hc
        ? catalogFieldsFromHardcover(hc)
        : { ...f, hardcover_book_id: null };
    }
  }

  const linked = f.hardcover_book_id != null;
  const match = await findFuzzyMatch(admin, f, linked);
  if (match) {
    if (linked) {
      const { error } = await admin
        .from("catalog_books")
        .update(hardcoverRefreshPatch(match, f))
        .eq("id", match.id);
      // Unique violation: a concurrent request linked another row first.
      if (error) return findByHardcoverId(admin, f.hardcover_book_id!);
    }
    return match.id;
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("catalog_books")
    .insert({
      ...f,
      synced_at: linked ? now : null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (data) return data.id;
  if (linked) return findByHardcoverId(admin, f.hardcover_book_id!);
  console.error("[catalog] insert failed:", error?.message);
  return null;
}
