import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { parseGoodreadsCSV } from "@/lib/goodreads";
import { syncBookSeries } from "@/lib/seriesSync.server";

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

async function hcPost(query: string) {
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) {
    console.warn("[import] HARDCOVER_API_TOKEN not set");
    return null;
  }
  console.log("[import] POST Hardcover API (batch)");
  const res = await fetch(HC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error(`[import] Hardcover API error: ${res.status} ${res.statusText}`);
    return null;
  }
  return res.json();
}

function extractGenres(cached_tags: unknown): string[] {
  if (!cached_tags) return [];
  if (Array.isArray(cached_tags)) return cached_tags as string[];
  if (typeof cached_tags === "object") {
    return Object.values(cached_tags as Record<string, { tag?: string }[]>)
      .flat().map((t) => t?.tag ?? "").filter(Boolean).slice(0, 5);
  }
  return [];
}

interface HCBook {
  coverUrl: string; isbn: string; pageCount: number | null;
  genres: string[]; releaseDate: string; author: string;
}

function parseEditionAlias(alias: unknown, fallbackIsbn: string): HCBook | null {
  const editions = alias as { isbn_10?: string; isbn_13?: string; book?: { title?: string; image?: { url?: string }; pages?: number; release_date?: string; cached_tags?: unknown; contributions?: { author: { name: string } }[] } }[] | undefined;
  const edition = editions?.[0];
  if (!edition?.book?.title) return null;
  const b = edition.book;
  return {
    coverUrl: b.image?.url ?? "",
    isbn: edition.isbn_13 || edition.isbn_10 || fallbackIsbn,
    pageCount: b.pages ?? null,
    genres: extractGenres(b.cached_tags),
    releaseDate: b.release_date ?? "",
    author: (b.contributions ?? []).map((c: { author: { name: string } }) => c.author.name).join(", "),
  };
}

function parseSearchAlias(alias: unknown, title: string): HCBook | null {
  const result = alias as { results?: unknown } | undefined;
  if (!result?.results) return null;
  const parsed: { hits?: { document: { title?: string; author_names?: string[]; cover_image_url?: string; isbn_13?: string | string[]; isbn_10?: string | string[]; pages?: number; cached_tags?: unknown; release_date?: string; release_year?: string | number } }[] } =
    typeof result.results === "string" ? JSON.parse(result.results) : result.results;
  const d = parsed?.hits?.[0]?.document;
  if (!d?.title) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!norm(d.title).includes(norm(title).slice(0, 5))) return null;
  return {
    coverUrl: d.cover_image_url ?? "",
    isbn: (Array.isArray(d.isbn_13) ? d.isbn_13[0] : d.isbn_13) || (Array.isArray(d.isbn_10) ? d.isbn_10[0] : d.isbn_10) || "",
    pageCount: d.pages ?? null,
    genres: extractGenres(d.cached_tags),
    releaseDate: d.release_date ?? String(d.release_year ?? ""),
    author: (d.author_names ?? []).join(", "),
  };
}

async function fetchHCBatch(
  previews: ReturnType<typeof parseGoodreadsCSV>
): Promise<(HCBook | null)[]> {
  const queryBooks = previews.map(({ entry, isbn }) => ({
    title: entry.title,
    author: entry.author,
    isbn: isbn || undefined,
  }));

  const json = await hcPost(buildBatchQuery(queryBooks));
  const data = json?.data ?? {};

  if (json?.errors) {
    console.error("[import] GraphQL errors:", JSON.stringify(json.errors));
  }

  return previews.map(({ entry, isbn }, i) => {
    const alias = data[`b${i}`];
    if (isbn) {
      const result = parseEditionAlias(alias, isbn);
      if (result) return result;
      // ISBN miss — fall back to search alias result if available
      console.log(`[import] ISBN edition miss for "${entry.title}", no search fallback in batch`);
      return null;
    }
    return parseSearchAlias(alias, entry.title);
  });
}

async function setProgress(supabase: ReturnType<typeof createServerClient>, data: object) {
  await supabase.auth.updateUser({ data: { goodreads_import: data } });
}

async function runImport(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  previews: ReturnType<typeof parseGoodreadsCSV>
) {
  const total = previews.length;
  console.log(`[import] Starting Goodreads import for user ${userId}, ${total} books`);

  for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
    const batch = previews.slice(batchStart, batchStart + BATCH_SIZE);

    await setProgress(supabase, { status: "running", total, processed: batchStart });

    console.log(`[import] Batch HC lookup ${batchStart + 1}–${batchStart + batch.length}/${total}: ${batch.map((p) => p.entry.title).join(", ")}`);

    const hcResults = await fetchHCBatch(batch);

    // DB writes — sequential, no delay needed here
    for (let j = 0; j < batch.length; j++) {
      const { entry, isbn } = batch[j];
      const hc = hcResults[j];
      const i = batchStart + j;

      console.log(`[import] DB write ${i + 1}/${total}: "${entry.title}" hc=${hc ? "hit" : "miss"}`);

      const resolvedAuthor = entry.author || hc?.author || "";
      const resolvedIsbn   = isbn || hc?.isbn || "";
      const coverUrl       = hc?.coverUrl ?? "";
      const pageCount      = hc?.pageCount ?? null;
      const releaseDate    = hc?.releaseDate ?? "";
      const genres         = hc?.genres?.length
        ? Array.from(new Set([...entry.genres, ...hc.genres]))
        : entry.genres;

      const { data: existing } = await supabase
        .from("books")
        .select("id, status, date_finished, date_shelved, genres, release_date, cover_url, isbn, book_reads(id, status, date_finished, date_shelved)")
        .eq("user_id", userId)
        .ilike("title", entry.title)
        .ilike("author", resolvedAuthor || "%")
        .maybeSingle();

      if (!existing) {
        console.log(`[import] Inserting: "${entry.title}"`);
        const id = crypto.randomUUID();
        await supabase.from("books").insert({
          id, user_id: userId,
          title: entry.title, author: resolvedAuthor,
          release_date: releaseDate, genres, cover_url: coverUrl,
          isbn: resolvedIsbn, page_count: pageCount,
          status: entry.status,
          date_started: entry.dateStarted || null,
          date_finished: entry.dateFinished || null,
          date_shelved: entry.dateShelved || null,
          rating: entry.rating, feeling: entry.feeling, bookmarked: false,
          created_at: entry.createdAt, updated_at: entry.updatedAt,
        });

        if (["finished", "reading"].includes(entry.status)) {
          await syncBookSeries(supabase, userId, {
            id, title: entry.title, author: resolvedAuthor,
            status: entry.status, coverUrl,
          });
        }
      } else {
        const mergedGenres = Array.from(new Set([...(existing.genres ?? []), ...genres]));
        const patch: Record<string, unknown> = {};
        if (mergedGenres.length > (existing.genres ?? []).length) patch.genres = mergedGenres;
        if (!existing.release_date && releaseDate) patch.release_date = releaseDate;
        if (!existing.cover_url && coverUrl)       patch.cover_url   = coverUrl;
        if (!existing.isbn && resolvedIsbn)        patch.isbn        = resolvedIsbn;
        if (pageCount)                             patch.page_count  = pageCount;
        if (Object.keys(patch).length) {
          console.log(`[import] Patching "${entry.title}": ${Object.keys(patch).join(", ")}`);
          await supabase.from("books").update(patch).eq("id", existing.id).eq("user_id", userId);
        } else {
          console.log(`[import] No changes for existing: "${entry.title}"`);
        }

        if (entry.status === "finished" && entry.dateFinished !== existing.date_finished) {
          const reads = (existing.book_reads ?? []) as { status: string; date_finished: string | null }[];
          if (!reads.some((r) => r.status === "finished" && r.date_finished === entry.dateFinished)) {
            await supabase.from("book_reads").insert({
              book_id: existing.id, user_id: userId, status: entry.status,
              date_started: entry.dateStarted || null, date_finished: entry.dateFinished || null,
              date_shelved: null, rating: entry.rating, feeling: entry.feeling,
              created_at: entry.createdAt, updated_at: entry.updatedAt,
            });
          }
        } else if (entry.status === "did-not-finish" && entry.dateShelved !== existing.date_shelved) {
          const reads = (existing.book_reads ?? []) as { status: string; date_shelved: string | null }[];
          if (!reads.some((r) => r.status === "did-not-finish" && r.date_shelved === entry.dateShelved)) {
            await supabase.from("book_reads").insert({
              book_id: existing.id, user_id: userId, status: entry.status,
              date_started: entry.dateStarted || null, date_finished: null,
              date_shelved: entry.dateShelved || null, rating: entry.rating, feeling: entry.feeling,
              created_at: entry.createdAt, updated_at: entry.updatedAt,
            });
          }
        }
      }
    }

    // One delay per batch (rate-limit the HC API)
    await sleep(DELAY_MS);
  }

  console.log(`[import] Complete for user ${userId}, ${total} books processed`);
  await setProgress(supabase, { status: "done", total, processed: total });
  await supabase.auth.updateUser({ data: { goodreads_imported: true } });
}

// ── GET: return current import progress ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const progress = user.user_metadata?.goodreads_import ?? { status: "idle", total: 0, processed: 0 };
  return NextResponse.json(progress);
}

// ── POST: start import from CSV text ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { csv } = await req.json();
  if (!csv?.trim()) return NextResponse.json({ error: "csv required" }, { status: 400 });

  const previews = parseGoodreadsCSV(csv);
  if (!previews.length) return NextResponse.json({ error: "no books found" }, { status: 400 });

  console.log(`[import] POST received, ${previews.length} books, user ${user.id}`);
  await setProgress(supabase, { status: "running", total: previews.length, processed: 0 });

  after(async () => {
    await runImport(supabase, user.id, previews);
  });

  return NextResponse.json({ started: true, total: previews.length });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
