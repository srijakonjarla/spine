import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const HC_ENDPOINT = "https://api.hardcover.app/v1/graphql";
const DELAY_MS = 1100;
const BATCH_SIZE = 10;

// ── Build a batched GraphQL query for up to BATCH_SIZE books ──────────────────
function buildBatchQuery(books: { title: string; author: string; isbn?: string }[]) {
  const fragments = books.map((b, i) => {
    if (b.isbn) {
      return `
        b${i}: editions(where: {
          _or: [{ isbn_10: { _eq: "${b.isbn}" } }, { isbn_13: { _eq: "${b.isbn}" } }]
        }, limit: 1) {
          isbn_10 isbn_13
          book { id title pages release_date image { url } contributions { author { name } } cached_tags }
        }
      `;
    }
    const q = [b.title, b.author].filter(Boolean).join(" ").replace(/"/g, "");
    return `
      b${i}: search(query: "${q}", query_type: "Book", per_page: 1) {
        results
      }
    `;
  });
  return `query BatchLookup { ${fragments.join("\n")} }`;
}

interface HardcoverDocument {
  id?: number | string;
  title?: string;
  author_names?: string[];
  cover_image_url?: string;
  isbn_13?: string | string[];
  isbn_10?: string | string[];
  pages?: number;
  cached_tags?: string[] | Record<string, { tag?: string }[]>;
  release_year?: number | string;
  release_date?: string;
}

interface EnrichResult {
  coverUrl: string;
  isbn: string;
  pageCount: number | null;
  genres: string[];
}

async function hcPost(query: string) {
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) {
    console.warn("[backfill] HARDCOVER_API_TOKEN not set — skipping Hardcover lookup");
    return null;
  }
  console.log("[backfill] POST Hardcover API");
  const res = await fetch(HC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error(`[backfill] Hardcover API error: ${res.status} ${res.statusText}`);
    return null;
  }
  return res.json();
}

function extractGenres(cached_tags: HardcoverDocument["cached_tags"]): string[] {
  if (!cached_tags) return [];
  if (Array.isArray(cached_tags)) return cached_tags as string[];
  return Object.values(cached_tags as Record<string, { tag?: string }[]>)
    .flat()
    .map((t) => t?.tag ?? "")
    .filter(Boolean)
    .slice(0, 5);
}

function parseEditionResult(alias: unknown, isbn: string): EnrichResult | null {
  const editions = alias as { isbn_10?: string; isbn_13?: string; book?: { title?: string; image?: { url?: string }; pages?: number; cached_tags?: unknown } }[] | undefined;
  const edition = editions?.[0];
  if (!edition?.book?.title) return null;
  const b = edition.book;
  return {
    coverUrl: b.image?.url ?? "",
    isbn: edition.isbn_13 || edition.isbn_10 || isbn,
    pageCount: b.pages ?? null,
    genres: extractGenres(b.cached_tags as HardcoverDocument["cached_tags"]),
  };
}

function parseSearchResult(alias: unknown, title: string): EnrichResult | null {
  const searchResult = alias as { results?: unknown } | undefined;
  if (!searchResult?.results) return null;
  const parsed: { hits?: { document: HardcoverDocument }[] } =
    typeof searchResult.results === "string"
      ? JSON.parse(searchResult.results)
      : searchResult.results;
  const d = parsed?.hits?.[0]?.document;
  if (!d?.title) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!norm(d.title).includes(norm(title).slice(0, 6))) return null;
  const isbn13 = Array.isArray(d.isbn_13) ? d.isbn_13[0] : d.isbn_13 ?? "";
  const isbn10 = Array.isArray(d.isbn_10) ? d.isbn_10[0] : d.isbn_10 ?? "";
  return {
    coverUrl: d.cover_image_url ?? "",
    isbn: isbn13 || isbn10,
    pageCount: d.pages ?? null,
    genres: extractGenres(d.cached_tags),
  };
}

// ── Google Books fallback — cover + ISBN only ─────────────────────────────────
async function googleFallback(title: string, author: string, isbn?: string): Promise<Pick<EnrichResult, "coverUrl" | "isbn"> | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const query = isbn ? `isbn:${isbn}` : `${title} ${author}`.trim();
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1&printType=books${key ? `&key=${key}` : ""}`;

  console.log(`[backfill] Google Books fallback for "${title}"`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[backfill] Google Books error: ${res.status}`);
    return null;
  }
  const json = await res.json();
  const item = json.items?.[0];
  if (!item) return null;

  const identifiers = item.volumeInfo?.industryIdentifiers ?? [];
  const isbn13 = identifiers.find((i: { type: string; identifier: string }) => i.type === "ISBN_13")?.identifier ?? "";
  const isbn10 = identifiers.find((i: { type: string; identifier: string }) => i.type === "ISBN_10")?.identifier ?? "";
  const thumbnail = item.volumeInfo?.imageLinks?.thumbnail ?? item.volumeInfo?.imageLinks?.smallThumbnail ?? "";

  return {
    coverUrl: thumbnail.replace(/^http:/, "https:"),
    isbn: isbn13 || isbn10,
  };
}

interface BookRow {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  isbn: string;
  page_count: number | null;
  genres: string[];
}

async function processAllBooks(supabase: ReturnType<typeof createServerClient>, userId: string) {
  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;

  console.log(`[backfill] Starting for user ${userId}`);

  while (true) {
    const { data: books } = await supabase
      .from("books")
      .select("id, title, author, cover_url, isbn, page_count, genres")
      .eq("user_id", userId)
      .or("cover_url.is.null,cover_url.eq.")
      .order("created_at", { ascending: true })
      .range(offset, offset + 39);

    if (!books?.length) break;
    console.log(`[backfill] Fetched ${books.length} books at offset ${offset}`);

    for (let batchStart = 0; batchStart < books.length; batchStart += BATCH_SIZE) {
      const batch = (books as BookRow[]).slice(batchStart, batchStart + BATCH_SIZE);

      console.log(`[backfill] Batch HC lookup: ${batch.map((b) => b.title).join(", ")}`);

      const batchQuery = buildBatchQuery(batch.map((b) => ({ title: b.title, author: b.author, isbn: b.isbn || undefined })));
      const json = await hcPost(batchQuery);
      const data = json?.data ?? {};

      if (json?.errors) {
        console.error("[backfill] GraphQL errors:", JSON.stringify(json.errors));
      }

      for (let i = 0; i < batch.length; i++) {
        const book = batch[i];
        const alias = data[`b${i}`];

        let result: EnrichResult | null = null;

        // 1. Try Hardcover (ISBN edition lookup or text search)
        if (book.isbn) {
          result = parseEditionResult(alias, book.isbn);
          if (!result) {
            console.log(`[backfill] HC ISBN miss for "${book.title}", trying HC text search`);
            const fallbackJson = await hcPost(
              `query { b0: search(query: "${[book.title, book.author].join(" ").replace(/"/g, "")}", query_type: "Book", per_page: 1) { results } }`
            );
            if (fallbackJson?.data?.b0) result = parseSearchResult(fallbackJson.data.b0, book.title);
            await sleep(DELAY_MS);
          }
        } else {
          result = parseSearchResult(alias, book.title);
        }

        // 2. Google Books fallback for anything Hardcover missed
        const needsCover = !result?.coverUrl;
        const needsIsbn  = !result?.isbn && !book.isbn;
        if (needsCover || needsIsbn) {
          const gb = await googleFallback(book.title, book.author, book.isbn || undefined);
          if (gb) {
            console.log(`[backfill] Google Books filled in for "${book.title}": ${[needsCover && "cover", needsIsbn && "isbn"].filter(Boolean).join(", ")}`);
            result = {
              coverUrl:  result?.coverUrl  || gb.coverUrl,
              isbn:      result?.isbn      || gb.isbn,
              pageCount: result?.pageCount ?? null,
              genres:    result?.genres    ?? [],
            };
          }
        }

        if (!result) {
          console.log(`[backfill] No result anywhere for "${book.title}"`);
          totalProcessed++;
          continue;
        }

        const patch: Record<string, unknown> = {};
        if (result.coverUrl)                               patch.cover_url  = result.coverUrl;
        if (!book.isbn && result.isbn)                     patch.isbn       = result.isbn;
        if (!book.page_count && result.pageCount)          patch.page_count = result.pageCount;
        if (!book.genres?.length && result.genres.length)  patch.genres     = result.genres;

        if (Object.keys(patch).length) {
          console.log(`[backfill] Updating "${book.title}": ${Object.keys(patch).join(", ")}`);
          await supabase.from("books").update(patch).eq("id", book.id).eq("user_id", userId);
          totalUpdated++;
        } else {
          console.log(`[backfill] No changes needed for "${book.title}"`);
        }

        totalProcessed++;
      }

      await sleep(DELAY_MS);
    }

    if (books.length < 40) break;
    offset += 40;
  }

  console.log(`[backfill] Done. Processed: ${totalProcessed}, Updated: ${totalUpdated}`);
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { count } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or("cover_url.is.null,cover_url.eq.");

  console.log(`[backfill] GET remaining count for user ${user.id}: ${count}`);
  return NextResponse.json({ remaining: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { count: total } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or("cover_url.is.null,cover_url.eq.");

  console.log(`[backfill] POST started for user ${user.id}, books needing enrichment: ${total}`);

  after(async () => {
    await processAllBooks(supabase, user.id);
  });

  return NextResponse.json({ started: true, total: total ?? 0 });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
