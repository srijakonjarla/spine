import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { parseGoodreadsCSV } from "@/lib/goodreads";
import { syncBookSeries } from "@/lib/seriesSync.server";
import { upsertBookForUser } from "@/lib/bookUpsert.server";

const HC_ENDPOINT = "https://api.hardcover.app/v1/graphql";
const DELAY_MS = 1100;
const BATCH_SIZE = 10;

const DEFAULT_EDITIONS_QUERY = `
  query DefaultEditions($ids: [Int!]!) {
    books(where: { id: { _in: $ids } }) {
      id
      default_physical_edition_id
      images { url }
      cached_tags
      editions {
        id
        isbn_13
        isbn_10
        image { url }
      }
    }
  }
`;

function buildBatchQuery(
  books: { title: string; author: string; isbn?: string }[],
) {
  const fragments = books.map((b, i) => {
    if (b.isbn) {
      return `
        b${i}: editions(where: {
          _or: [{ isbn_10: { _eq: "${b.isbn}" } }, { isbn_13: { _eq: "${b.isbn}" } }]
        }, limit: 1) {
          isbn_10 isbn_13
          image { url }
          book { id title pages release_date images { url } contributions { author { name } } cached_tags }
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

interface BookEnrichment {
  isbn: string;
  coverUrl: string;
  genres: string[];
}

async function fetchDefaultEditionData(
  bookIds: number[],
): Promise<Map<number, BookEnrichment>> {
  if (!bookIds.length) return new Map();
  const json = await hcPost(DEFAULT_EDITIONS_QUERY, { ids: bookIds });
  const books: {
    id: number;
    default_physical_edition_id: number;
    images?: { url?: string }[];
    cached_tags?: unknown;
    editions: {
      id: number;
      isbn_13?: string;
      isbn_10?: string;
      image?: { url?: string };
    }[];
  }[] = json?.data?.books ?? [];
  const map = new Map<number, BookEnrichment>();
  for (const book of books) {
    const edition = book.editions.find(
      (e) => e.id === book.default_physical_edition_id,
    );
    map.set(book.id, {
      isbn: edition?.isbn_13 || edition?.isbn_10 || "",
      coverUrl: edition?.image?.url || book.images?.[0]?.url || "",
      genres: extractGenres(book.cached_tags),
    });
  }
  return map;
}

async function hcPost(query: string, variables?: Record<string, unknown>) {
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) {
    console.warn("[import] HARDCOVER_API_TOKEN not set");
    return null;
  }
  console.log("[import] POST Hardcover API (batch)");
  const res = await fetch(HC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    console.error(`[import] Hardcover error: ${res.status}`);
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

interface HCBook {
  title: string;
  coverUrl: string;
  isbn: string;
  pageCount: number | null;
  genres: string[];
  releaseDate: string;
  author: string;
}

function parseEditionAlias(
  alias: unknown,
  fallbackIsbn: string,
): HCBook | null {
  const editions = alias as
    | {
        isbn_10?: string;
        isbn_13?: string;
        image?: { url?: string };
        book?: {
          title?: string;
          images?: { url?: string }[];
          pages?: number;
          release_date?: string;
          cached_tags?: unknown;
          contributions?: { author: { name: string } }[];
        };
      }[]
    | undefined;
  const edition = editions?.[0];
  if (!edition?.book?.title) return null;
  const b = edition.book;
  return {
    title: b.title ?? "",
    coverUrl: edition.image?.url || b.images?.[0]?.url || "",
    isbn: edition.isbn_13 || edition.isbn_10 || fallbackIsbn,
    pageCount: b.pages ?? null,
    genres: extractGenres(b.cached_tags),
    releaseDate: b.release_date ?? "",
    author: (b.contributions ?? [])
      .map((c: { author: { name: string } }) => c.author.name)
      .join(", "),
  };
}

function parseSearchAlias(
  alias: unknown,
  title: string,
  authorHint?: string,
): (HCBook & { bookId?: number }) | null {
  const result = alias as { results?: unknown } | undefined;
  if (!result?.results) return null;
  const parsed: {
    hits?: {
      document: {
        title?: string;
        author_names?: string[];
        cover_image_url?: string;
        pages?: number;
        cached_tags?: unknown;
        release_date?: string;
        release_year?: string | number;
      };
    }[];
  } =
    typeof result.results === "string"
      ? JSON.parse(result.results)
      : result.results;
  const d = parsed?.hits?.[0]?.document;
  if (!d?.title) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normTitle = norm(title);
  const normResult = norm(d.title);
  // For short titles (≤8 normalized chars) require the result to start with
  // the full title, not just a prefix slice — prevents e.g. the wrong "Bound"
  // from matching when there are multiple books with the same short title.
  if (normTitle.length <= 8) {
    if (!normResult.startsWith(normTitle)) return null;
  } else {
    if (!normResult.includes(normTitle.slice(0, 6))) return null;
  }
  // When the caller supplied an author, verify at least one result author
  // shares a last-name token with it. This catches wrong-book matches where
  // the title happens to be the same (e.g. "Bound" by two different authors).
  if (authorHint && d.author_names?.length) {
    const normAuthor = norm(authorHint);
    // Extract last-name token: split on non-alpha boundary, take the last segment
    const lastName = (s: string) => {
      const tokens = norm(s).match(/[a-z0-9]+/g) ?? [];
      return tokens[tokens.length - 1] ?? norm(s);
    };
    const hintLastName = lastName(authorHint);
    const authorMatches = hintLastName.length >= 3 && d.author_names.some((a) =>
      lastName(a) === hintLastName || norm(a).includes(normAuthor) || normAuthor.includes(norm(a)),
    );
    if (!authorMatches) return null;
  }
  return {
    title: d.title,
    coverUrl: d.cover_image_url ?? "",
    isbn: "",
    pageCount: d.pages ?? null,
    genres: extractGenres(d.cached_tags),
    releaseDate: d.release_date ?? String(d.release_year ?? ""),
    author: (d.author_names ?? []).join(", "),
    bookId:
      (d as { id?: unknown }).id !== undefined &&
      !isNaN(Number((d as { id?: unknown }).id))
        ? Number((d as { id?: unknown }).id)
        : undefined,
  };
}

async function fetchHCBatch(
  previews: ReturnType<typeof parseGoodreadsCSV>,
): Promise<(HCBook | null)[]> {
  const queryBooks = previews.map(({ entry, isbn }) => ({
    title: entry.title,
    author: entry.author,
    isbn: isbn || undefined,
  }));
  const json = await hcPost(buildBatchQuery(queryBooks));
  const data = json?.data ?? {};
  if (json?.errors)
    console.error("[import] GraphQL errors:", JSON.stringify(json.errors));

  const rawResults = previews.map(({ entry, isbn }, i) => {
    const alias = data[`b${i}`];
    if (isbn) {
      const result = parseEditionAlias(alias, isbn);
      if (result) return result;
      console.log(`[import] ISBN edition miss for "${entry.title}"`);
      return null;
    }
    return parseSearchAlias(alias, entry.title, entry.author);
  });

  const bookIds = rawResults
    .map((r) => (r as (HCBook & { bookId?: number }) | null)?.bookId)
    .filter((id): id is number => id !== undefined);
  const enrichMap = await fetchDefaultEditionData(bookIds);
  if (bookIds.length)
    console.log(
      `[import] enrichment follow-up: ${enrichMap.size}/${bookIds.length} resolved`,
    );

  return rawResults.map((r) => {
    if (!r) return null;
    const bookId = (r as HCBook & { bookId?: number }).bookId;
    const enrich = bookId ? enrichMap.get(bookId) : undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bookId: _, ...rest } = r as HCBook & { bookId?: number };
    return {
      ...rest,
      isbn: enrich?.isbn || rest.isbn,
      coverUrl: enrich?.coverUrl || rest.coverUrl,
      genres: enrich?.genres?.length ? enrich.genres : rest.genres,
    };
  });
}

async function setProgress(
  supabase: ReturnType<typeof createServerClient>,
  data: object,
) {
  await supabase.auth.updateUser({ data: { goodreads_import: data } });
}

async function runImport(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  previews: ReturnType<typeof parseGoodreadsCSV>,
) {
  const total = previews.length;
  console.log(`[import] Starting for user ${userId}, ${total} books`);

  for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
    const batch = previews.slice(batchStart, batchStart + BATCH_SIZE);
    await setProgress(supabase, {
      status: "running",
      total,
      processed: batchStart,
    });
    console.log(
      `[import] Batch HC lookup ${batchStart + 1}–${batchStart + batch.length}/${total}`,
    );

    const hcResults = await fetchHCBatch(batch);

    for (let j = 0; j < batch.length; j++) {
      const { entry, isbn } = batch[j];
      const hc = hcResults[j];
      const i = batchStart + j;

      console.log(
        `[import] DB write ${i + 1}/${total}: "${entry.title}" hc=${hc ? "hit" : "miss"}`,
      );

      // Only accept Hardcover's title if it loosely matches the Goodreads
      // title. Hardcover can return the wrong book when a foreign-edition ISBN
      // maps to a different title in their database (e.g. "Vengeful" →
      // "Victorious"). Goodreads is the source of truth for what the user
      // actually shelved.
      const normForCompare = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normEntry = normForCompare(entry.title);
      const normHc = hc?.title ? normForCompare(hc.title) : "";
      // For short titles (≤8 chars) require a full prefix match, not a 6-char slice
      const prefixLen = Math.max(normEntry.length, 6);
      const hcTitleOk =
        !hc?.title ||
        normHc.startsWith(normEntry.slice(0, prefixLen)) ||
        normEntry.startsWith(normHc.slice(0, prefixLen));
      const resolvedTitle = hcTitleOk ? (hc?.title || entry.title) : entry.title;
      if (hc?.title && !hcTitleOk) {
        console.log(
          `[import] Title mismatch — keeping Goodreads title "${entry.title}" over Hardcover "${hc.title}"`,
        );
      }
      const resolvedAuthor = entry.author || hc?.author || "";
      const resolvedIsbn = isbn || hc?.isbn || "";
      const coverUrl = hc?.coverUrl ?? "";
      const pageCount = hc?.pageCount ?? null;
      const releaseDate = hc?.releaseDate ?? "";
      // Genres come exclusively from Hardcover — Goodreads "genres" are the
      // user's custom bookshelves (e.g. "favorites", "my-2024-reads") and
      // should never be stored as catalog genre metadata.
      const genres = hc?.genres ?? [];

      // Two-step duplicate check: find catalog_books by title first, then
      // look up user_books by catalog_book_id. This avoids relying on
      // PostgREST embedded-resource filters which don't reliably act as
      // parent-row join conditions.
      // Normalize author string for loose comparison (collapse spaces, lowercase)
      const normalizeAuthor = (a: string) =>
        a.toLowerCase().replace(/\s+/g, " ").trim();

      const findExisting = async (title: string) => {
        // Fetch all catalog_books matching this title (case-insensitive).
        // We intentionally skip the author filter in the DB query because
        // author formatting varies between Goodreads, Hardcover, and stored
        // values (e.g. "V.E. Schwab" vs "V. E. Schwab", double spaces).
        // We filter by author in code after fetching.
        const { data: cbs } = await supabase
          .from("catalog_books")
          .select("id, author, genres, release_date, cover_url, isbn")
          .ilike("title", title)
          .limit(10);
        if (!cbs?.length) return null;

        // Pick the catalog entry whose author best matches. If resolvedAuthor
        // is set, prefer an entry where the stored author contains or is
        // contained by the resolved author (handles abbreviations / extra
        // spaces). Fall back to the first result when author is absent.
        const normResolved = normalizeAuthor(resolvedAuthor);
        const cb = resolvedAuthor
          ? (cbs.find((c) => {
              const normStored = normalizeAuthor(c.author ?? "");
              return (
                normStored === normResolved ||
                normStored.includes(normResolved) ||
                normResolved.includes(normStored)
              );
            }) ?? cbs[0])
          : cbs[0];

        const { data: ub } = await supabase
          .from("user_books")
          .select("id, status, date_finished, date_shelved")
          .eq("user_id", userId)
          .eq("catalog_book_id", cb.id)
          .maybeSingle();
        if (!ub) return null;
        return { ...ub, catalog_books: cb };
      };

      let existing = await findExisting(resolvedTitle);
      if (!existing && resolvedTitle !== entry.title) {
        existing = await findExisting(entry.title);
      }

      if (!existing) {
        const newId = crypto.randomUUID();
        const result = await upsertBookForUser(
          supabase,
          userId,
          {
            title: resolvedTitle,
            author: resolvedAuthor,
            cover_url: coverUrl,
            isbn: resolvedIsbn,
            release_date: releaseDate,
            genres,
            page_count: pageCount,
          },
          {
            id: newId,
            status: entry.status,
            date_started: entry.dateStarted || null,
            date_finished: entry.dateFinished || null,
            date_shelved: entry.dateShelved || null,
            rating: entry.rating,
            feeling: entry.feeling,
            bookshelves: entry.genres,
            bookmarked: false,
            created_at: entry.createdAt,
            updated_at: entry.updatedAt,
          },
        );

        if (result && ["finished", "reading"].includes(entry.status)) {
          await syncBookSeries(supabase, userId, {
            id: result.userBookId,
            title: resolvedTitle,
            author: resolvedAuthor,
            status: entry.status,
            coverUrl: coverUrl,
          });
        }
      } else {
        // Upgrade status if Goodreads has a higher-priority status than what's
        // stored. This handles books manually shelved as TBR before the import
        // that Goodreads knows as finished/reading.
        // Priority: finished > reading > did-not-finish > want-to-read
        const STATUS_PRIORITY: Record<string, number> = {
          finished: 4,
          reading: 3,
          "did-not-finish": 2,
          "want-to-read": 1,
        };
        const incomingPriority = STATUS_PRIORITY[entry.status] ?? 0;
        const existingPriority = STATUS_PRIORITY[existing.status] ?? 0;
        const userBookPatch: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (incomingPriority > existingPriority) {
          userBookPatch.status = entry.status;
          userBookPatch.date_started = entry.dateStarted || null;
          userBookPatch.date_finished = entry.dateFinished || null;
          userBookPatch.date_shelved = entry.dateShelved || null;
          if (entry.rating) userBookPatch.rating = entry.rating;
          if (entry.feeling) userBookPatch.feeling = entry.feeling;
        }
        if (entry.genres.length) userBookPatch.bookshelves = entry.genres;
        if (Object.keys(userBookPatch).length > 1) {
          await supabase
            .from("user_books")
            .update(userBookPatch)
            .eq("id", existing.id);
        }

        // Patch the catalog entry with any better data we found
        const cb = existing.catalog_books as unknown as {
          id: string;
          genres: string[];
          release_date: string;
          cover_url: string;
          isbn: string;
        } | null;
        if (cb) {
          const catalogPatch: Record<string, unknown> = {};
          // Update title to Hardcover canonical version if it differs
          if (resolvedTitle && resolvedTitle !== entry.title)
            catalogPatch.title = resolvedTitle;
          // Only overwrite genres if Hardcover returned some — never merge
          // with existing values that may have come from Goodreads shelves.
          if (genres.length) catalogPatch.genres = genres;
          if (!cb.release_date && releaseDate)
            catalogPatch.release_date = releaseDate;
          if (!cb.cover_url && coverUrl) catalogPatch.cover_url = coverUrl;
          if (!cb.isbn && resolvedIsbn) catalogPatch.isbn = resolvedIsbn;
          if (pageCount) catalogPatch.page_count = pageCount;
          if (Object.keys(catalogPatch).length) {
            catalogPatch.updated_at = new Date().toISOString();
            await supabase
              .from("catalog_books")
              .update(catalogPatch)
              .eq("id", cb.id);
          }
        }

        // Add a new book_reads row if this is a distinct re-read
        if (
          entry.status === "finished" &&
          entry.dateFinished !== existing.date_finished
        ) {
          const { data: reads } = await supabase
            .from("book_reads")
            .select("status, date_finished")
            .eq("book_id", existing.id);
          const alreadyLogged = (reads ?? []).some(
            (r: { status: string; date_finished: string | null }) =>
              r.status === "finished" && r.date_finished === entry.dateFinished,
          );
          if (!alreadyLogged) {
            await supabase.from("book_reads").insert({
              book_id: existing.id,
              user_id: userId,
              status: entry.status,
              date_started: entry.dateStarted || null,
              date_finished: entry.dateFinished || null,
              date_shelved: null,
              rating: entry.rating,
              feeling: entry.feeling,
              created_at: entry.createdAt,
              updated_at: entry.updatedAt,
            });
          }
        } else if (
          entry.status === "did-not-finish" &&
          entry.dateShelved !== existing.date_shelved
        ) {
          const { data: reads } = await supabase
            .from("book_reads")
            .select("status, date_shelved")
            .eq("book_id", existing.id);
          const alreadyLogged = (reads ?? []).some(
            (r: { status: string; date_shelved: string | null }) =>
              r.status === "did-not-finish" &&
              r.date_shelved === entry.dateShelved,
          );
          if (!alreadyLogged) {
            await supabase.from("book_reads").insert({
              book_id: existing.id,
              user_id: userId,
              status: entry.status,
              date_started: entry.dateStarted || null,
              date_finished: null,
              date_shelved: entry.dateShelved || null,
              rating: entry.rating,
              feeling: entry.feeling,
              created_at: entry.createdAt,
              updated_at: entry.updatedAt,
            });
          }
        }
      }
    }

    await sleep(DELAY_MS);
  }

  console.log(`[import] Complete for user ${userId}, ${total} books`);
  await setProgress(supabase, { status: "done", total, processed: total });
  await supabase.auth.updateUser({ data: { goodreads_imported: true } });
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const progress = user.user_metadata?.goodreads_import ?? {
    status: "idle",
    total: 0,
    processed: 0,
  };
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { csv } = await req.json();
  if (!csv?.trim())
    return NextResponse.json({ error: "csv required" }, { status: 400 });

  const previews = parseGoodreadsCSV(csv);
  if (!previews.length)
    return NextResponse.json({ error: "no books found" }, { status: 400 });

  console.log(
    `[import] POST received, ${previews.length} books, user ${user.id}`,
  );
  await setProgress(supabase, {
    status: "running",
    total: previews.length,
    processed: 0,
  });

  after(async () => {
    await runImport(supabase, user.id, previews);
  });

  return NextResponse.json({ started: true, total: previews.length });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
