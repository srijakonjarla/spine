import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { parseGoodreadsCSV } from "@/lib/goodreads";
import { syncBookSeries } from "@/lib/seriesSync.server";
import { upsertBookForUser } from "@/lib/bookUpsert.server";

const HC_ENDPOINT = "https://api.hardcover.app/v1/graphql";
const DELAY_MS = 1100;
const BATCH_SIZE = 10;

// Shared field set for both ISBN and title+author batch fragments.
const BOOK_FIELDS = `
  id title pages release_date
  images { url }
  contributions { author { name } }
  cached_tags
  default_physical_edition_id
  editions { id isbn_13 isbn_10 image { url } }
`;

/** Sanitize a string for safe inline embedding in a GQL query literal. */
function gqlStr(s: string, maxLen = 120): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\n\r]/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Extract the last word of an author name (surname) for a partial match filter. */
function authorLastName(author: string): string {
  const clean = author.replace(/[^a-zA-Z\s''-]/g, "").trim();
  const parts = clean.split(/\s+/);
  return (parts[parts.length - 1] ?? "").slice(0, 30);
}

function buildBatchQuery(
  books: { title: string; author: string; isbn?: string }[],
) {
  const fragments = books.map((b, i) => {
    if (b.isbn) {
      const isbn = gqlStr(b.isbn);
      return `
        b${i}: books(where: {
          _or: [
            { editions: { isbn_13: { _eq: "${isbn}" } } },
            { editions: { isbn_10: { _eq: "${isbn}" } } }
          ]
        }, limit: 1) { ${BOOK_FIELDS} }
      `;
    }
    // No ISBN — use structured title + author query for deterministic results.
    const title = gqlStr(b.title);
    const lastName = gqlStr(authorLastName(b.author));
    const authorFilter = lastName
      ? `, contributions: { author: { name: { _ilike: "%${lastName}%" } } }`
      : "";
    return `
      b${i}: books(where: {
        title: { _ilike: "%${title}%" }
        ${authorFilter}
      }, limit: 3) { ${BOOK_FIELDS} }
    `;
  });
  return `query BatchLookup { ${fragments.join("\n")} }`;
}

/** Collect all isbn_13/isbn_10 values from a list of editions. */
function collectIsbns(editions: { isbn_13?: string; isbn_10?: string }[]): string[] {
  return [
    ...new Set(
      editions
        .flatMap((e) => [e.isbn_13, e.isbn_10])
        .filter((isbn): isbn is string => !!isbn && isbn.length > 0),
    ),
  ];
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
  /** All known edition ISBNs for this book. */
  isbns: string[];
  pageCount: number | null;
  genres: string[];
  releaseDate: string;
  author: string;
}

type RawHCBook = {
  id?: number;
  title?: string;
  pages?: number;
  release_date?: string;
  images?: { url?: string }[];
  contributions?: { author: { name: string } }[];
  cached_tags?: unknown;
  default_physical_edition_id?: number;
  editions?: { id?: number; isbn_13?: string; isbn_10?: string; image?: { url?: string } }[];
};

/**
 * Parse a raw HC `books` table row into our internal HCBook shape.
 * Both ISBN and title+author batch fragments now return the same `books` shape,
 * so a single parser handles both paths.
 */
function parseBookRow(
  book: RawHCBook,
  fallbackIsbn = "",
): (HCBook & { bookId: number }) | null {
  if (!book?.title) return null;
  const editions = book.editions ?? [];
  const defaultEdition = editions.find((e) => e.id === book.default_physical_edition_id);
  const isbns = collectIsbns(editions);
  const primaryIsbn = defaultEdition?.isbn_13 || defaultEdition?.isbn_10 || isbns[0] || fallbackIsbn;
  const coverUrl = defaultEdition?.image?.url || book.images?.[0]?.url || "";

  return {
    title: book.title,
    coverUrl,
    isbn: primaryIsbn,
    isbns,
    pageCount: book.pages ?? null,
    genres: extractGenres(book.cached_tags),
    releaseDate: book.release_date ?? "",
    author: (book.contributions ?? []).map((c) => c.author.name).join(", "),
    bookId: book.id!,
  };
}

/**
 * Validate that a HC result actually matches the Goodreads title + author.
 * Returns the matching book or null.
 */
function bestMatchFromBooks(
  books: RawHCBook[],
  titleHint: string,
  authorHint: string,
  fallbackIsbn = "",
): (HCBook & { bookId: number }) | null {
  if (!books.length) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nt = norm(titleHint);
  const lastName = (s: string) => {
    const tokens = norm(s).match(/[a-z0-9]+/g) ?? [];
    return tokens[tokens.length - 1] ?? norm(s);
  };
  const hintLast = lastName(authorHint);

  for (const book of books) {
    if (!book.title) continue;
    const nr = norm(book.title);

    // Title check — for short titles require full prefix match to avoid
    // "Bound" matching "Bound by Honor", etc.
    const titleOk =
      nt.length <= 8
        ? nr.startsWith(nt) || nt.startsWith(nr)
        : nr.includes(nt.slice(0, 6)) || nt.includes(nr.slice(0, 6));
    if (!titleOk) continue;

    // Author check — verify surname overlap when author is known
    if (authorHint && book.contributions?.length) {
      const authorOk =
        hintLast.length < 3 ||
        book.contributions.some((c) => {
          const an = norm(c.author.name);
          return (
            lastName(c.author.name) === hintLast ||
            an.includes(norm(authorHint)) ||
            norm(authorHint).includes(an)
          );
        });
      if (!authorOk) continue;
    }

    const parsed = parseBookRow(book, fallbackIsbn);
    if (parsed) return parsed;
  }
  return null;
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

  // Both ISBN and title+author fragments return `books[]` rows with editions
  // inline — no second enrichment pass needed.
  return previews.map(({ entry, isbn }, i) => {
    const books: RawHCBook[] = data[`b${i}`] ?? [];
    const result = bestMatchFromBooks(books, entry.title, entry.author, isbn);
    if (!result) {
      if (isbn) console.log(`[import] ISBN miss for "${entry.title}" (${isbn})`);
      else console.log(`[import] Title/author miss for "${entry.title}"`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bookId: _, ...rest } = result ?? ({} as HCBook & { bookId: number });
    return result ? rest : null;
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

      // findExisting: checks ISBN array first (catches different-edition imports),
      // then falls back to title+author text match.
      const findExisting = async (title: string, isbnToCheck?: string) => {
        // 1. ISBN array lookup — most reliable, handles edition mismatches
        if (isbnToCheck) {
          const { data: byIsbn } = await supabase
            .from("catalog_books")
            .select("id, author, genres, release_date, cover_url, isbn, isbns")
            .contains("isbns", [isbnToCheck])
            .maybeSingle();
          if (byIsbn) {
            const { data: ub } = await supabase
              .from("user_books")
              .select("id, status, date_finished, date_shelved")
              .eq("user_id", userId)
              .eq("catalog_book_id", byIsbn.id)
              .maybeSingle();
            if (ub) return { ...ub, catalog_books: byIsbn };
          }
        }

        // 2. Title+author text match
        const { data: cbs } = await supabase
          .from("catalog_books")
          .select("id, author, genres, release_date, cover_url, isbn, isbns")
          .ilike("title", title)
          .limit(10);
        if (!cbs?.length) return null;

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

      let existing = await findExisting(resolvedTitle, resolvedIsbn || undefined);
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
            isbns: hc?.isbns ?? (resolvedIsbn ? [resolvedIsbn] : []),
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
