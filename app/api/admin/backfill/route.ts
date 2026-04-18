import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const HC_ENDPOINT = "https://api.hardcover.app/v1/graphql";
const DELAY_MS = 1100;
const BATCH_SIZE = 10;

const BOOK_FIELDS = `
  id title pages release_date
  images { url }
  contributions { author { name } }
  cached_tags
  default_physical_edition_id
  editions { id isbn_13 isbn_10 image { url } }
`;

function gqlStr(s: string, maxLen = 120): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\n\r]/g, " ")
    .trim()
    .slice(0, maxLen);
}

function authorLastName(author: string): string {
  const clean = author.replace(/[^a-zA-Z\s''-]/g, "").trim();
  if (author.includes(",")) return (clean.split(/\s+/)[0] ?? "").slice(0, 30);
  const parts = clean.split(/\s+/);
  return (parts[parts.length - 1] ?? "").slice(0, 30);
}

function stripTitle(title: string): string {
  let t = title.trim().replace(/\bvol\.?\b/gi, "Volume");
  t = t.replace(/\s*\([^)]*\)\s*$/, "");
  t = t.replace(/\s*:\s*.+$/, "");
  t = t.replace(/\s+by\s+[A-Z][\w.'\-]+(?:\s+[\w.'\-]+)*$/, "");
  t = t.replace(/,\s+[A-Z][\w.'\-]+(?:\s+[A-Z][\w.'\-]+)+\s*$/, "");
  return t.trim();
}

function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titlesMatch(hcTitle: string, csvTitle: string): boolean {
  if (!hcTitle || !csvTitle) return false;
  const hc = normTitle(stripTitle(hcTitle));
  const csv = normTitle(stripTitle(csvTitle));
  if (!hc || !csv) return false;
  if (hc === csv) return true;
  const shorter = hc.length <= csv.length ? hc : csv;
  const longer = hc.length <= csv.length ? csv : hc;
  if (!longer.startsWith(shorter) || shorter.length < 6) return false;
  const BOX = /\b(boxed? set|box set|omnibus|collection|trilogy|the complete|\d-book)\b/i;
  if (BOX.test(hcTitle) && !BOX.test(csvTitle)) return false;
  return true;
}

async function hcPost(query: string) {
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) {
    console.warn("[backfill] HARDCOVER_API_TOKEN not set");
    return null;
  }
  const res = await fetch(HC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error(`[backfill] Hardcover error: ${res.status}`);
    return null;
  }
  return res.json();
}

function extractGenres(cached_tags: unknown): string[] {
  if (!cached_tags) return [];
  if (Array.isArray(cached_tags)) return cached_tags as string[];
  if (typeof cached_tags === "object") {
    return Object.values(cached_tags as Record<string, { tag?: string }[]>)
      .flat()
      .map((t) => t?.tag ?? "")
      .filter(Boolean)
      .slice(0, 5);
  }
  return [];
}

function collectIsbns(editions: { isbn_13?: string; isbn_10?: string }[]): string[] {
  return [
    ...new Set(
      editions
        .flatMap((e) => [e.isbn_13, e.isbn_10])
        .filter((isbn): isbn is string => !!isbn && isbn.length > 0),
    ),
  ];
}

interface StaleRow {
  id: string;
  title: string;
  author: string;
  release_date: string;
  cover_url: string;
  page_count: number | null;
  genres: string[] | null;
  isbns: string[] | null;
}

interface HCDoc {
  id?: number | string;
  title?: string;
  author_names?: string[];
}

interface HCBookRow {
  id?: number;
  title?: string;
  pages?: number;
  release_date?: string;
  images?: { url?: string }[];
  contributions?: { author: { name: string } }[];
  cached_tags?: unknown;
  default_physical_edition_id?: number;
  editions?: { id?: number; isbn_13?: string; isbn_10?: string; image?: { url?: string } }[];
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
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<StaleRow[]> {
  const { data, error } = await supabase
    .from("user_books")
    .select(
      "catalog_books!inner(id, title, author, release_date, cover_url, page_count, genres, isbns)",
    )
    .eq("user_id", userId)
    .or(
      "cover_url.eq.,isbns.is.null,isbns.eq.{},genres.is.null,genres.eq.{},release_date.like.%-01-01",
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
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const stale = await fetchStaleBooks(supabase, userId);
  console.log(`[backfill] ${stale.length} catalog rows to enrich for user ${userId}`);

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
        ]}, limit: 1) { ${BOOK_FIELDS} }`;
      }
      const base = stripTitle(row.title);
      const last = authorLastName(row.author);
      const q = gqlStr(last ? `${base} ${last}` : base, 120);
      return `b${i}: search(query: "${q}", query_type: "Book", per_page: 3) { results }`;
    });
    const batchQuery = `query BackfillBatch { ${fragments.join("\n")} }`;
    const batchJson = await hcPost(batchQuery);
    const batchData = batchJson?.data ?? {};

    // Collect hits: direct books (ISBN path) and search → id (search path).
    const directHits: { idx: number; row: StaleRow; book: HCBookRow }[] = [];
    const searchHits: { idx: number; row: StaleRow; bookId: number }[] = [];

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const raw = batchData[`b${i}`];
      const firstIsbn = row.isbns?.[0];
      if (firstIsbn) {
        const books: HCBookRow[] = Array.isArray(raw) ? raw : [];
        const book = books.find((b) => titlesMatch(b.title ?? "", row.title));
        if (book) {
          directHits.push({ idx: i, row, book });
          console.log(`[backfill]   ISBN hit "${row.title}"`);
        } else {
          console.log(`[backfill]   ISBN miss "${row.title}"`);
        }
        continue;
      }
      const rawResults = raw?.results;
      if (!rawResults) continue;
      let parsed: { hits?: { document: HCDoc }[] };
      try {
        parsed = typeof rawResults === "string" ? JSON.parse(rawResults) : rawResults;
      } catch {
        continue;
      }
      const docs = parsed?.hits ?? [];
      const hintLast = normTitle(authorLastName(row.author));
      for (const { document: doc } of docs) {
        if (!doc.title) continue;
        if (!titlesMatch(doc.title, row.title)) continue;
        if (hintLast.length >= 3 && doc.author_names?.length) {
          const ok = doc.author_names.some((a) => normTitle(a).includes(hintLast));
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
    const searchBooks = new Map<number, HCBookRow>();
    if (searchHits.length) {
      const followUpFragments = searchHits.map(
        ({ idx, bookId }) =>
          `b${idx}: books(where: {id: {_eq: ${bookId}}}, limit: 1) { ${BOOK_FIELDS} }`,
      );
      const followUpQuery = `query BackfillFollowUp { ${followUpFragments.join("\n")} }`;
      const followUpJson = await hcPost(followUpQuery);
      const followUpData = followUpJson?.data ?? {};
      for (const { idx, bookId } of searchHits) {
        const raw = followUpData[`b${idx}`];
        const books: HCBookRow[] = Array.isArray(raw) ? raw : [];
        if (books[0]) searchBooks.set(bookId, books[0]);
      }
    }

    // Step 3: apply enrichment patches.
    const applyPatch = async (row: StaleRow, book: HCBookRow) => {
      const editions = book.editions ?? [];
      const defaultEdition = editions.find((e) => e.id === book.default_physical_edition_id);
      const isbns = collectIsbns(editions);
      const coverUrl = defaultEdition?.image?.url || book.images?.[0]?.url || "";
      const genres = extractGenres(book.cached_tags);

      const patch: Record<string, unknown> = {};
      if (isbns.length && !(row.isbns?.length)) patch.isbns = isbns;
      if (genres.length && !(row.genres?.length)) patch.genres = genres;
      if (book.release_date && book.release_date !== row.release_date) {
        patch.release_date = book.release_date;
      }
      if (book.pages && !row.page_count) patch.page_count = book.pages;
      if (coverUrl) patch.cover_url = coverUrl;

      if (Object.keys(patch).length) {
        patch.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from("catalog_books")
          .update(patch)
          .eq("id", row.id);
        if (error) console.error(`[backfill]   update error ${row.id}: ${error.message}`);
        else
          console.log(
            `[backfill]   ✓ ${row.title} → ${Object.keys(patch).filter((k) => k !== "updated_at").join(", ")}`,
          );
      } else {
        console.log(`[backfill]   (no patch) ${row.title}`);
      }
    };

    for (const { row, book } of directHits) await applyPatch(row, book);
    for (const { row, bookId } of searchHits) {
      const book = searchBooks.get(bookId);
      if (book) await applyPatch(row, book);
    }

    await sleep(DELAY_MS);
  }

  console.log(`[backfill] done for user ${userId}`);
}

async function countStale(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<number> {
  const rows = await fetchStaleBooks(supabase, userId);
  return rows.length;
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const remaining = await countStale(supabase, user.id);
  return NextResponse.json({ remaining });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const total = await countStale(supabase, user.id);
  console.log(`[backfill] POST started for user ${user.id}, ${total} stale rows`);

  after(async () => {
    await runBackfill(supabase, user.id);
  });

  return NextResponse.json({ started: true, total });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
