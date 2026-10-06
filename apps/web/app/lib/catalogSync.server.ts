/**
 * Keeps catalog_books in step with Hardcover.
 *
 * - Linked rows (hardcover_book_id set) are re-fetched by id and refreshed.
 * - Unlinked rows are resolved to a Hardcover id by ISBN, then by
 *   title + author search, and linked on success.
 *
 * Every row Hardcover answered for gets `synced_at = now()`, so a row it
 * can't resolve isn't retried until it goes stale again. A failed request
 * stops the run without stamping anything.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type HCBook,
  type RawHCBook,
  authorLastName,
  docId,
  fetchBooksByIds,
  fetchBooksByIsbns,
  normTitle,
  parseBookRow,
  searchDocs,
  sleep,
  stripTitle,
  titlesMatch,
} from "@/lib/hardcover.server";
import {
  catalogFieldsFromHardcover,
  hardcoverRefreshPatch,
} from "@/lib/catalogStore.server";

const LOG = "[catalog-sync]";
const BATCH_SIZE = 10;
// Hardcover allows ~60 requests/min. A batch makes up to three requests
// (ISBNs, refresh by id, search follow-up) plus one per title search.
const BATCH_DELAY_MS = 2000;
const SEARCH_DELAY_MS = 1000;
export const STALE_AFTER_DAYS = 30;

export const SYNC_COLUMNS =
  "id, title, author, cover_url, isbns, genres, hardcover_book_id";

export interface SyncRow {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  isbns: string[] | null;
  genres: string[] | null;
  hardcover_book_id: number | null;
}

export interface SyncResult {
  /** True when Hardcover requests failed and the run stopped early. */
  aborted: boolean;
  refreshed: number;
  linked: number;
  unresolved: number;
  /** Rows whose Hardcover id is already claimed by another catalog row. */
  duplicates: { id: string; title: string; hardcoverBookId: number }[];
}

/** Pick the ISBN-lookup hit whose title matches, borrowing audio from siblings. */
function pickIsbnHit(books: RawHCBook[], row: SyncRow): HCBook | null {
  const book = books.find((b) => titlesMatch(b.title ?? "", row.title));
  const parsed = book ? parseBookRow(book) : null;
  if (!parsed) return null;
  if (parsed.audioDurationMinutes == null) {
    for (const sib of books) {
      if (sib === book || !titlesMatch(sib.title ?? "", row.title)) continue;
      const audio = parseBookRow(sib)?.audioDurationMinutes;
      if (audio != null) {
        parsed.audioDurationMinutes = audio;
        break;
      }
    }
  }
  return parsed;
}

/**
 * Resolve Hardcover books for unlinked rows: one batched ISBN request, then a
 * title + author search for rows without an ISBN hit. Returns null when a
 * Hardcover request fails, so callers don't mistake an outage for "not on
 * Hardcover".
 */
async function resolveUnlinked(
  rows: SyncRow[],
): Promise<Map<string, HCBook> | null> {
  const out = new Map<string, HCBook>();
  if (!rows.length) return out;

  const byIsbn = await fetchBooksByIsbns(
    rows.map((r) => r.isbns?.[0] ?? ""),
    { logPrefix: LOG },
  );
  if (!byIsbn) return null;

  const searchIds = new Map<string, number>();
  for (const row of rows) {
    const isbn = row.isbns?.[0];
    const hit = isbn ? pickIsbnHit(byIsbn.get(isbn) ?? [], row) : null;
    if (hit) {
      out.set(row.id, hit);
      continue;
    }

    const last = authorLastName(row.author);
    const base = stripTitle(row.title);
    const docs = await searchDocs(last ? `${base} ${last}` : base, 3, {
      logPrefix: LOG,
    });
    if (!docs) return null;
    await sleep(SEARCH_DELAY_MS);
    const hintLast = normTitle(last);
    const doc = docs.find(
      (d) =>
        d.title &&
        titlesMatch(d.title, row.title) &&
        (hintLast.length < 3 ||
          !d.author_names?.length ||
          d.author_names.some((a) => normTitle(a).includes(hintLast))),
    );
    const id = doc ? docId(doc) : null;
    if (id != null) searchIds.set(row.id, id);
  }

  if (searchIds.size) {
    const books = await fetchBooksByIds([...searchIds.values()], {
      logPrefix: LOG,
    });
    if (!books) return null;
    for (const [rowId, hcId] of searchIds) {
      const b = books.get(hcId);
      if (b) out.set(rowId, b);
    }
  }
  return out;
}

export async function syncCatalogRows(
  admin: SupabaseClient,
  rows: SyncRow[],
): Promise<SyncResult> {
  const result: SyncResult = {
    aborted: false,
    refreshed: 0,
    linked: 0,
    unresolved: 0,
    duplicates: [],
  };

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const linkedRows = batch.filter((r) => r.hardcover_book_id != null);
    const unlinkedRows = batch.filter((r) => r.hardcover_book_id == null);

    const [byId, resolved] = await Promise.all([
      fetchBooksByIds(
        linkedRows.map((r) => r.hardcover_book_id!),
        { logPrefix: LOG },
      ),
      resolveUnlinked(unlinkedRows),
    ]);
    // Stop without touching synced_at so the rows are retried next run.
    if (!byId || !resolved) {
      console.error(`${LOG} Hardcover request failed — stopping run`);
      result.aborted = true;
      break;
    }

    for (const row of batch) {
      const hc =
        row.hardcover_book_id != null
          ? byId.get(row.hardcover_book_id)
          : resolved.get(row.id);
      const now = new Date().toISOString();

      if (!hc?.hardcoverBookId) {
        result.unresolved++;
        await admin
          .from("catalog_books")
          .update({ synced_at: now })
          .eq("id", row.id);
        continue;
      }

      const { error } = await admin
        .from("catalog_books")
        .update(hardcoverRefreshPatch(row, catalogFieldsFromHardcover(hc)))
        .eq("id", row.id);

      if (!error) {
        if (row.hardcover_book_id != null) result.refreshed++;
        else result.linked++;
        continue;
      }
      if (error.code === "23505") {
        result.duplicates.push({
          id: row.id,
          title: row.title,
          hardcoverBookId: hc.hardcoverBookId,
        });
        console.warn(
          `${LOG} "${row.title}" duplicates the row linked to HC ${hc.hardcoverBookId}`,
        );
      } else {
        console.error(`${LOG} update ${row.id} failed: ${error.message}`);
      }
      await admin
        .from("catalog_books")
        .update({ synced_at: now })
        .eq("id", row.id);
    }

    if (start + BATCH_SIZE < rows.length) await sleep(BATCH_DELAY_MS);
  }

  console.log(
    `${LOG} ${result.aborted ? "aborted" : "done"}: ${result.refreshed} refreshed, ${result.linked} linked, ` +
      `${result.unresolved} unresolved, ${result.duplicates.length} duplicates`,
  );
  return result;
}

/** Rows never synced or last synced more than STALE_AFTER_DAYS ago. */
export async function fetchStaleRows(
  admin: SupabaseClient,
  limit: number,
): Promise<SyncRow[]> {
  const cutoff = new Date(
    Date.now() - STALE_AFTER_DAYS * 86_400_000,
  ).toISOString();
  const { data, error } = await admin
    .from("catalog_books")
    .select(SYNC_COLUMNS)
    .or(`synced_at.is.null,synced_at.lt.${cutoff}`)
    .order("synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) console.error(`${LOG} stale query failed: ${error.message}`);
  return (data ?? []) as SyncRow[];
}
