import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { parseGoodreadsCSV } from "@/lib/goodreads";
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

/**
 * Extract the surname from an author name, handling both "First Last" and
 * Goodreads "Last, First" formats.
 */
function authorLastName(author: string): string {
  const clean = author.replace(/[^a-zA-Z\s''-]/g, "").trim();
  // "Last, First" — comma means the first token is the surname
  if (author.includes(",")) return (clean.split(/\s+/)[0] ?? "").slice(0, 30);
  const parts = clean.split(/\s+/);
  return (parts[parts.length - 1] ?? "").slice(0, 30);
}

/**
 * Strip Goodreads series suffix, subtitle, and trailing author pollution so
 * variant titles collapse to a shared canonical form for matching.
 * "Lovelight Farms (Lovelight, #1)" → "Lovelight Farms"
 * "Saga, Vol. 1" → "Saga, Volume 1" (normalized, preserves volume number)
 * "Good to Great: ...Don't by Jim Collins" → "Good to Great"
 * "Roots: The Saga of an American Family" → "Roots"
 * "The Woods by Harlan Coben" → "The Woods"
 * "One Flew Over the Cuckoo's Nest, Ken Kesey" → "One Flew Over the Cuckoo's Nest"
 */
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

/**
 * Validate that an HC-returned title legitimately matches the CSV title.
 * Exact-equality on the normalized-and-stripped form; prefix extension is only
 * accepted for subtitle-appended HC titles ("Good to Great" ⊂ "Good to Great:
 * Why Some Companies Make the Leap..."). Non-ASCII in the tail rejects
 * translated editions; a boxed-set marker on the HC side only rejects bundles.
 */
function titlesMatch(hcTitle: string, csvTitle: string): boolean {
  if (!hcTitle || !csvTitle) return false;
  const hcStripped = stripTitle(hcTitle);
  const csvStripped = stripTitle(csvTitle);
  const hc = normTitle(hcStripped);
  const csv = normTitle(csvStripped);
  if (!hc || !csv) return false;
  if (hc === csv) return true;

  const shorter = hc.length <= csv.length ? hc : csv;
  const longer = hc.length <= csv.length ? csv : hc;
  if (!longer.startsWith(shorter) || shorter.length < 6) return false;

  const BOX = /\b(boxed? set|box set|omnibus|collection|trilogy|the complete|\d-book)\b/i;
  if (BOX.test(hcTitle) && !BOX.test(csvTitle)) return false;

  const shortFull = hcStripped.length <= csvStripped.length ? hcStripped : csvStripped;
  const longFull = hcStripped.length <= csvStripped.length ? csvStripped : hcStripped;
  const tail = longFull.slice(shortFull.length);
  // eslint-disable-next-line no-control-regex
  if (tail.length > 6 && /[^\x00-\x7f]/.test(tail)) return false;

  return true;
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
    // No ISBN — HC does not allow _ilike queries; use the search endpoint instead.
    // Strip series suffix ("Title (Series, #N)") before searching — HC titles
    // don't include series info and the suffix breaks search results.
    const baseTitle = stripTitle(b.title);
    const lastName = authorLastName(b.author);
    const searchQuery = gqlStr(
      lastName ? `${baseTitle} ${lastName}` : baseTitle,
      120,
    );
    return `b${i}: search(query: "${searchQuery}", query_type: "Book", per_page: 3) { results }`;
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

/** Shape of a document returned by HC's search endpoint. */
interface HardcoverDocument {
  id?: number | string;
  title?: string;
  author_names?: string[];
  cover_image_url?: string;
  isbn_13?: string | string[];
  isbn_10?: string | string[];
  pages?: number;
  release_year?: number | string;
  release_date?: string;
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
  const lastName = (s: string) => {
    const tokens = normTitle(s).match(/[a-z0-9]+/g) ?? [];
    return tokens[tokens.length - 1] ?? normTitle(s);
  };
  const hintLast = lastName(authorHint);

  for (const book of books) {
    if (!book.title) continue;
    if (!titlesMatch(book.title, titleHint)) continue;

    if (authorHint && book.contributions?.length) {
      const authorOk =
        hintLast.length < 3 ||
        book.contributions.some((c) => {
          const an = normTitle(c.author.name);
          return (
            lastName(c.author.name) === hintLast ||
            an.includes(normTitle(authorHint)) ||
            normTitle(authorHint).includes(an)
          );
        });
      if (!authorOk) continue;
    }

    const parsed = parseBookRow(book, fallbackIsbn);
    if (parsed) return parsed;
  }
  return null;
}

/** Parse a HC search result document into an HCBook (best-effort, no editions). */
function parseSearchDoc(
  doc: HardcoverDocument,
  fallbackIsbn: string,
): HCBook {
  const rawIsbn13 = Array.isArray(doc.isbn_13) ? doc.isbn_13[0] : doc.isbn_13;
  const rawIsbn10 = Array.isArray(doc.isbn_10) ? doc.isbn_10[0] : doc.isbn_10;
  const isbn = rawIsbn13 || rawIsbn10 || fallbackIsbn;
  const isbns = [...new Set([rawIsbn13, rawIsbn10].filter((v): v is string => !!v))];
  const releaseDate = doc.release_date
    ? String(doc.release_date)
    : doc.release_year
      ? `${doc.release_year}-01-01`
      : "";
  return {
    title: doc.title ?? "",
    author: (doc.author_names ?? []).join(", "),
    coverUrl: doc.cover_image_url ?? "",
    isbn,
    isbns,
    pageCount: doc.pages ?? null,
    genres: [],
    releaseDate,
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
  const batchQuery = buildBatchQuery(queryBooks);
  console.log("[import] Batch query:\n", batchQuery);
  const json = await hcPost(batchQuery);
  const data = json?.data ?? {};
  if (json?.errors)
    console.error("[import] GraphQL errors:", JSON.stringify(json.errors));

  // Search path returns a thin document (no editions, no cached_tags, year-only
  // date). Track hit ids so we can follow up with the full `books` fetch that
  // the ISBN path uses, then merge the richer data in below.
  const enrichmentTargets: { idx: number; bookId: number }[] = [];

  const results: (HCBook | null)[] = previews.map(({ entry, isbn }, i) => {
    const raw = data[`b${i}`];

    if (isbn) {
      // ISBN path — response is books[]
      const books: RawHCBook[] = Array.isArray(raw) ? raw : [];
      console.log(`[import] b${i} ISBN="${isbn}" title="${entry.title}" → ${books.length} book(s) from HC`);
      const result = bestMatchFromBooks(books, entry.title, entry.author, isbn);
      if (!result) {
        console.log(`[import]   └─ no match (${books.map((b) => b.title).join(", ") || "empty"})`);
      } else {
        console.log(`[import]   └─ matched "${result.title}" isbn=${result.isbn}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bookId: _, ...rest } = result ?? ({} as HCBook & { bookId: number });
      return result ? rest : null;
    } else {
      // No-ISBN path — response is { results: JSON blob }
      const rawResults = raw?.results;
      console.log(`[import] b${i} search title="${entry.title}" → raw=${JSON.stringify(raw)?.slice(0, 200)}`);
      if (!rawResults) {
        console.log(`[import]   └─ no results field`);
        return null;
      }
      let parsed: { hits?: { document: HardcoverDocument }[] };
      try {
        parsed = typeof rawResults === "string" ? JSON.parse(rawResults) : rawResults;
      } catch {
        console.error(`[import]   └─ failed to parse search results`);
        return null;
      }
      const hits = parsed?.hits ?? [];
      console.log(`[import]   └─ ${hits.length} hit(s): ${hits.map((h: { document?: HardcoverDocument }) => h.document?.title).join(", ")}`);

      const hintLast = normTitle(authorLastName(entry.author));

      for (const { document: doc } of hits) {
        if (!doc.title) continue;
        if (!titlesMatch(doc.title, entry.title)) continue;
        if (hintLast.length >= 3 && doc.author_names?.length) {
          const authorOk = doc.author_names.some((a) => normTitle(a).includes(hintLast));
          if (!authorOk) continue;
        }
        const book = parseSearchDoc(doc, isbn);
        console.log(`[import]   └─ matched "${book.title}" isbn=${book.isbn}`);
        const hcId = typeof doc.id === "string" ? Number(doc.id) : doc.id;
        if (typeof hcId === "number" && Number.isFinite(hcId)) {
          enrichmentTargets.push({ idx: i, bookId: hcId });
        }
        return book;
      }

      console.log(`[import]   └─ no hit matched title/author filters`);
      return null;
    }
  });

  // Follow-up: fetch full `books` rows for search-path hits so they get the
  // same editions/cached_tags/release_date as the ISBN path.
  if (enrichmentTargets.length) {
    const fragments = enrichmentTargets.map(
      ({ idx, bookId }) =>
        `b${idx}: books(where: {id: {_eq: ${bookId}}}, limit: 1) { ${BOOK_FIELDS} }`,
    );
    const followUpQuery = `query FollowUpLookup { ${fragments.join("\n")} }`;
    console.log(
      `[import] Follow-up enrichment for ${enrichmentTargets.length} search-path hit(s)`,
    );
    const followUpJson = await hcPost(followUpQuery);
    const followUpData = followUpJson?.data ?? {};
    if (followUpJson?.errors)
      console.error(
        "[import] Follow-up GraphQL errors:",
        JSON.stringify(followUpJson.errors),
      );

    for (const { idx } of enrichmentTargets) {
      const raw = followUpData[`b${idx}`];
      const books: RawHCBook[] = Array.isArray(raw) ? raw : [];
      const book = books[0];
      const existing = results[idx];
      if (!book || !existing) continue;
      const parsed = parseBookRow(book, existing.isbn);
      if (!parsed) continue;
      results[idx] = {
        title: existing.title,
        author: existing.author,
        isbns: parsed.isbns.length ? parsed.isbns : existing.isbns,
        isbn: existing.isbn || parsed.isbn,
        genres: parsed.genres.length ? parsed.genres : existing.genres,
        pageCount: existing.pageCount ?? parsed.pageCount,
        releaseDate: parsed.releaseDate || existing.releaseDate,
        coverUrl: existing.coverUrl || parsed.coverUrl,
      };
      console.log(
        `[import]   └─ enriched b${idx}: isbns=${parsed.isbns.length}, genres=${parsed.genres.length}, date=${parsed.releaseDate || "(none)"}`,
      );
    }
  }

  return results;
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

      // Only accept Hardcover's data if its title legitimately matches the
      // Goodreads title. Hardcover can return the wrong book for a foreign-
      // edition ISBN or a boxed-set ISBN. Goodreads is the source of truth
      // for what the user actually shelved.
      const hcTitleOk = !hc?.title || titlesMatch(hc.title, entry.title);
      if (hc?.title && !hcTitleOk) {
        console.log(
          `[import] Title mismatch — dropping Hardcover data for "${hc.title}", keeping Goodreads entry "${entry.title}"`,
        );
      }
      const safeHc = hcTitleOk ? hc : null;
      // If HC returned a bundle/translation for an ISBN lookup, drop the
      // CSV ISBN so it isn't merged onto a single-volume catalog row.
      const isHcRejection = !!hc?.title && !hcTitleOk;
      const resolvedTitle = stripTitle(safeHc?.title || entry.title);
      const resolvedAuthor = entry.author || safeHc?.author || "";
      const resolvedIsbn = isHcRejection ? "" : isbn || safeHc?.isbn || "";
      const coverUrl = safeHc?.coverUrl ?? "";
      const pageCount = safeHc?.pageCount ?? null;
      const releaseDate = safeHc?.releaseDate ?? "";
      // Genres come exclusively from Hardcover — Goodreads "genres" are the
      // user's custom bookshelves (e.g. "favorites", "my-2024-reads") and
      // should never be stored as catalog genre metadata.
      const genres = safeHc?.genres ?? [];

      const normalizeAuthor = (a: string) =>
        a.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean).sort().join(" ");

      // findExisting: checks ISBN array first (catches different-edition imports),
      // then falls back to title+author text match. Title is validated on the
      // ISBN path so a bad ISBN (e.g. boxed set ISBN on a single-volume entry)
      // doesn't collapse the new entry into an unrelated existing row.
      // Tracks whether the ISBN we passed in belongs to a *different* book in
      // the catalog so the caller can avoid propagating it onto the match.
      let csvIsbnBelongsToOtherBook = false;
      const findExisting = async (title: string, isbnToCheck?: string) => {
        // 1. ISBN lookup via isbns[] array.
        if (isbnToCheck) {
          const { data: byIsbn } = await supabase
            .from("catalog_books")
            .select("id, title, author, genres, release_date, cover_url, isbns")
            .contains("isbns", [isbnToCheck])
            .maybeSingle();
          if (byIsbn) {
            const titleOk = titlesMatch(title, (byIsbn as { title?: string }).title ?? "");
            if (!titleOk) {
              csvIsbnBelongsToOtherBook = true;
              console.log(
                `[import] ISBN ${isbnToCheck} matches existing "${(byIsbn as { title?: string }).title}" but titles diverge from "${title}" — falling through to title+author match`,
              );
            } else {
              const { data: ub } = await supabase
                .from("user_books")
                .select("id, status, date_finished, date_shelved")
                .eq("user_id", userId)
                .eq("catalog_book_id", byIsbn.id)
                .maybeSingle();
              if (ub) return { ...ub, catalog_books: byIsbn };
            }
          }
        }

        // 2. Title+author text match.
        // Bidirectional: query both "baseTitle%" (stored extends incoming) and
        // "firstWord%" (stored is the shorter form, e.g. "Roots" vs
        // "Roots: The Saga..."). Apostrophes become _ so straight/curly variants
        // both match. JS-side compares stripped+normalized keys.
        const baseTitle = stripTitle(title);
        const ilikePattern = baseTitle.replace(/[%_\\]/g, "\\$&").replace(/['']/g, "_");
        const firstWord = baseTitle.split(/\s+/)[0] ?? "";
        const [prefixRes, shortRes] = await Promise.all([
          supabase
            .from("catalog_books")
            .select("id, title, author, genres, release_date, cover_url, isbns")
            .ilike("title", `${ilikePattern}%`)
            .limit(20),
          firstWord
            ? supabase
                .from("catalog_books")
                .select("id, title, author, genres, release_date, cover_url, isbns")
                .ilike("title", `${firstWord}%`)
                .limit(20)
            : Promise.resolve({ data: [] }),
        ]);
        const seenIds = new Set<string>();
        const cbs = [...(prefixRes.data ?? []), ...(shortRes.data ?? [])].filter(
          (c) => !seenIds.has(c.id) && seenIds.add(c.id),
        );
        if (!cbs.length) return null;

        // Bidirectional title match on stripped+normalized keys.
        const inKey = normTitle(stripTitle(title));
        const normResolved = normalizeAuthor(resolvedAuthor);
        const cb = cbs.find((c) => {
          const cKey = normTitle(stripTitle(c.title ?? ""));
          const titleOk =
            !inKey || !cKey ||
            cKey === inKey ||
            cKey.startsWith(inKey) ||
            inKey.startsWith(cKey);
          if (!titleOk) return false;
          if (!resolvedAuthor) return true;
          const normStored = normalizeAuthor(c.author ?? "");
          if (!normStored) return false;
          return (
            normStored === normResolved ||
            normStored.includes(normResolved) ||
            normResolved.includes(normStored)
          );
        });

        if (!cb) {
          console.log(
            `[import] Title "${baseTitle}" has ${cbs.length} candidate(s) but none match author "${resolvedAuthor}" — creating new entry`,
          );
          return null;
        }

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
        // Drop the ISBN if we've already established it belongs to a different
        // catalog row — attaching it here would trigger a unique-constraint
        // collision inside upsertBookForUser and silently reuse the wrong row
        // via its isbnFallbackId path.
        const safeIsbn = csvIsbnBelongsToOtherBook ? "" : resolvedIsbn;
        const safeIsbns = csvIsbnBelongsToOtherBook
          ? []
          : safeHc?.isbns ?? (resolvedIsbn ? [resolvedIsbn] : []);
        await upsertBookForUser(
          supabase,
          userId,
          {
            title: resolvedTitle,
            author: resolvedAuthor,
            cover_url: coverUrl,
            isbn: safeIsbn,
            isbns: safeIsbns,
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
          isbns: string[] | null;
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
          // Merge any CSV / HC ISBNs we have into the isbns[] array — skip the
          // merge if we've proven the CSV ISBN belongs to a different catalog row.
          if (!csvIsbnBelongsToOtherBook) {
            const incomingIsbns = [
              ...new Set(
                [resolvedIsbn, ...(safeHc?.isbns ?? [])].filter((v): v is string => !!v),
              ),
            ];
            if (incomingIsbns.length) {
              const stored = cb.isbns ?? [];
              const merged = [...new Set([...stored, ...incomingIsbns])];
              if (merged.length > stored.length) catalogPatch.isbns = merged;
            }
          }
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
