import { NextRequest, NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, createServerClient } from "@/lib/supabase-server";
import {
  BOOK_FIELDS,
  type RawHCBook,
  authorLastName,
  gqlStr,
  hcPost,
  normTitle,
  parseBookRow,
  sleep,
  stripTitle,
  titlesMatch,
} from "@/lib/hardcover.server";

const DELAY_MS = 1100;
const BATCH_SIZE = 5;

interface StaleRow {
  id: string;
  title: string;
  author: string;
  release_date: string;
  cover_url: string;
  page_count: number | null;
  genres: string[] | null;
  isbns: string[] | null;
  audio_duration_minutes: number | null;
  publisher: string | null;
}

interface HCDoc {
  id?: number | string;
  title?: string;
  author_names?: string[];
}

/**
 * Selection criteria for enrichment: any catalog_book that the user owns and
 * is missing core metadata. Covers:
 *  - empty cover_url (classic "no cover" case)
 *  - empty isbns (can't dedupe imports across ISBN editions)
 *  - empty genres (search-path fallback doesn't fetch cached_tags)
 *  - release_date ending in "-01-01" (year-only, from search-path fallback)
 */
async function fetchStaleBooks(
  supabase: SupabaseClient,
  userId: string,
): Promise<StaleRow[]> {
  const { data, error } = await supabase
    .from("user_books")
    .select(
      "catalog_books!inner(id, title, author, release_date, cover_url, page_count, genres, isbns, audio_duration_minutes, publisher)",
    )
    .eq("user_id", userId)
    .or(
      "cover_url.eq.,isbns.is.null,isbns.eq.{},genres.is.null,genres.eq.{},release_date.like.%-01-01,publisher.is.null,publisher.eq.,audio_duration_minutes.is.null",
      { referencedTable: "catalog_books" },
    );
  if (error) {
    console.error("[backfill] query error:", error.message);
    return [];
  }
  const seen = new Set<string>();
  const rows: StaleRow[] = [];
  for (const ub of data ?? []) {
    const cb = ub.catalog_books as unknown as StaleRow;
    if (!cb?.id || !cb.title || !cb.author) continue;
    if (seen.has(cb.id)) continue;
    seen.add(cb.id);
    rows.push(cb);
  }
  return rows;
}

async function runBackfill(
  supabase: SupabaseClient,
  userId: string,
) {
  const stale = await fetchStaleBooks(supabase, userId);
  console.log(
    `[backfill] ${stale.length} catalog rows to enrich for user ${userId}`,
  );

  for (let start = 0; start < stale.length; start += BATCH_SIZE) {
    const batch = stale.slice(start, start + BATCH_SIZE);

    // Step 1: for each row, look up by ISBN if available, else search by
    // title+author. Both paths feed the same follow-up `books` enrichment.
    const fragments = batch.map((row, i) => {
      const firstIsbn = row.isbns?.[0];
      if (firstIsbn) {
        const isbn = gqlStr(firstIsbn);
        return `b${i}: books(where: { _or: [
          { editions: { isbn_13: { _eq: "${isbn}" } } },
          { editions: { isbn_10: { _eq: "${isbn}" } } }
        ]}, limit: 3) { ${BOOK_FIELDS} }`;
      }
      const base = stripTitle(row.title);
      const last = authorLastName(row.author);
      const q = gqlStr(last ? `${base} ${last}` : base, 120);
      return `b${i}: search(query: "${q}", query_type: "Book", per_page: 3) { results }`;
    });
    const batchQuery = `query BackfillBatch { ${fragments.join("\n")} }`;
    const batchJson = await hcPost(batchQuery, "[backfill]");
    const batchData = (batchJson?.data ?? {}) as Record<string, unknown>;

    // Collect hits: direct books (ISBN path) and search → id (search path).
    const directHits: {
      idx: number;
      row: StaleRow;
      book: RawHCBook;
      siblings: RawHCBook[];
    }[] = [];
    const searchHits: { idx: number; row: StaleRow; bookId: number }[] = [];

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const raw = batchData[`b${i}`];
      const firstIsbn = row.isbns?.[0];
      if (firstIsbn) {
        const books: RawHCBook[] = Array.isArray(raw) ? raw : [];
        const book = books.find((b) => titlesMatch(b.title ?? "", row.title));
        if (book) {
          directHits.push({ idx: i, row, book, siblings: books });
          console.log(`[backfill]   ISBN hit "${row.title}"`);
        } else {
          console.log(`[backfill]   ISBN miss "${row.title}"`);
        }
        continue;
      }
      const rawResults = (raw as { results?: unknown })?.results;
      if (!rawResults) continue;
      let parsed: { hits?: { document: HCDoc }[] };
      try {
        parsed =
          typeof rawResults === "string"
            ? JSON.parse(rawResults)
            : (rawResults as { hits?: { document: HCDoc }[] });
      } catch {
        continue;
      }
      const docs = parsed?.hits ?? [];
      const hintLast = normTitle(authorLastName(row.author));
      for (const { document: doc } of docs) {
        if (!doc.title) continue;
        if (!titlesMatch(doc.title, row.title)) continue;
        if (hintLast.length >= 3 && doc.author_names?.length) {
          const ok = doc.author_names.some((a) =>
            normTitle(a).includes(hintLast),
          );
          if (!ok) continue;
        }
        const hcId = typeof doc.id === "string" ? Number(doc.id) : doc.id;
        if (typeof hcId === "number" && Number.isFinite(hcId)) {
          searchHits.push({ idx: i, row, bookId: hcId });
          console.log(`[backfill]   search "${row.title}" → HC book ${hcId}`);
        }
        break;
      }
    }

    // Step 2: follow-up books query for search-path hits (same BOOK_FIELDS).
    const searchBooks = new Map<number, RawHCBook>();
    if (searchHits.length) {
      const followUpFragments = searchHits.map(
        ({ idx, bookId }) =>
          `b${idx}: books(where: {id: {_eq: ${bookId}}}, limit: 1) { ${BOOK_FIELDS} }`,
      );
      const followUpQuery = `query BackfillFollowUp { ${followUpFragments.join("\n")} }`;
      const followUpJson = await hcPost(followUpQuery, "[backfill]");
      const followUpData = (followUpJson?.data ?? {}) as Record<string, unknown>;
      for (const { idx, bookId } of searchHits) {
        const raw = followUpData[`b${idx}`];
        const books: RawHCBook[] = Array.isArray(raw) ? raw : [];
        if (books[0]) searchBooks.set(bookId, books[0]);
      }
    }

    // Step 3: apply enrichment patches.
    const applyPatch = async (
      row: StaleRow,
      book: RawHCBook,
      siblings: RawHCBook[] = [],
    ) => {
      const parsed = parseBookRow(book);
      if (!parsed) return;
      let audioDurationMinutes = parsed.audioDurationMinutes;
      // Borrow audio from a same-title sibling if the primary hit lacks it.
      if (audioDurationMinutes == null) {
        for (const sib of siblings) {
          if (sib === book) continue;
          if (!titlesMatch(sib.title ?? "", row.title)) continue;
          const sibAudio = parseBookRow(sib)?.audioDurationMinutes ?? null;
          if (sibAudio != null) {
            audioDurationMinutes = sibAudio;
            break;
          }
        }
      }

      const patch: Record<string, unknown> = {};
      if (parsed.isbns.length && !row.isbns?.length) patch.isbns = parsed.isbns;
      if (parsed.genres.length && !row.genres?.length)
        patch.genres = parsed.genres;
      if (parsed.releaseDate && parsed.releaseDate !== row.release_date) {
        patch.release_date = parsed.releaseDate;
      }
      if (parsed.pageCount && !row.page_count)
        patch.page_count = parsed.pageCount;
      if (parsed.coverUrl && !row.cover_url) patch.cover_url = parsed.coverUrl;
      if (audioDurationMinutes != null && row.audio_duration_minutes == null) {
        patch.audio_duration_minutes = audioDurationMinutes;
      }
      if (parsed.publisher && !row.publisher) patch.publisher = parsed.publisher;

      if (Object.keys(patch).length) {
        patch.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from("catalog_books")
          .update(patch)
          .eq("id", row.id);
        if (error)
          console.error(
            `[backfill]   update error ${row.id}: ${error.message}`,
          );
        else
          console.log(
            `[backfill]   ✓ ${row.title} → ${Object.keys(patch)
              .filter((k) => k !== "updated_at")
              .join(", ")}`,
          );
      } else {
        console.log(`[backfill]   (no patch) ${row.title}`);
      }
    };

    for (const { row, book, siblings } of directHits)
      await applyPatch(row, book, siblings);
    for (const { row, bookId } of searchHits) {
      const book = searchBooks.get(bookId);
      if (book) await applyPatch(row, book);
    }

    await sleep(DELAY_MS);
  }

  console.log(`[backfill] done for user ${userId}`);
  const { data: u } = await supabase.auth.admin.getUserById(userId);
  const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
  meta.backfill_running = false;
  await supabase.auth.admin.updateUserById(userId, { user_metadata: meta });
}

async function countStale(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const rows = await fetchStaleBooks(supabase, userId);
  return rows.length;
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const running = user.user_metadata?.backfill_running === true;
  const remaining = await countStale(supabase, user.id);
  return NextResponse.json({ remaining, running });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const total = await countStale(supabase, user.id);
  console.log(
    `[backfill] POST started for user ${user.id}, ${total} stale rows`,
  );

  // Use the service-role admin client for the background job — the user's
  // session JWT would expire mid-run for large backfills.
  const admin = createAdminClient();
  const userId = user.id;

  const { data: u } = await admin.auth.admin.getUserById(userId);
  const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
  meta.backfill_running = true;
  await admin.auth.admin.updateUserById(userId, { user_metadata: meta });

  after(async () => {
    await runBackfill(admin, userId);
  });

  return NextResponse.json({ started: true, total });
}
