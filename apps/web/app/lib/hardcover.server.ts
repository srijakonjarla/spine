/**
 * The single Hardcover GraphQL client. Every Hardcover call in the app goes
 * through `hcPost` here — catalog search, edition lookup, add-book resolution,
 * Goodreads import, and catalog sync.
 */

const HC_ENDPOINT = "https://api.hardcover.app/v1/graphql";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Shared field selection for every `books` query. Don't request author
 * `gender`/`nationality` — Hardcover answers 403 for the whole query.
 */
const BOOK_FIELDS = `
  id title pages release_date
  images { url }
  contributions { author { name } }
  cached_tags
  default_physical_edition_id
  editions { id isbn_13 isbn_10 image { url } publisher { name } audio_seconds }
  default_audio_edition_id
  default_audio_edition { audio_seconds }
`;

// ── Types ──────────────────────────────────────────────────────────────────

interface RawHCEdition {
  id?: number;
  isbn_13?: string;
  isbn_10?: string;
  image?: { url?: string };
  publisher?: { name?: string } | null;
  audio_seconds?: number | null;
}

export interface RawHCBook {
  id?: number;
  title?: string;
  pages?: number;
  release_date?: string;
  images?: { url?: string }[];
  contributions?: { author: { name: string } }[];
  cached_tags?: unknown;
  default_physical_edition_id?: number;
  editions?: RawHCEdition[];
  default_audio_edition_id?: number | null;
  default_audio_edition?: { audio_seconds?: number | null } | null;
}

export interface HCBook {
  /** Hardcover `books.id`. Null only for thin search documents without an id. */
  hardcoverBookId: number | null;
  title: string;
  author: string;
  coverUrl: string;
  isbn: string;
  isbns: string[];
  pageCount: number | null;
  genres: string[];
  diversityTags: string[];
  releaseDate: string;
  audioDurationMinutes: number | null;
  publisher: string;
}

export interface HardcoverDocument {
  id?: number | string;
  title?: string;
  author_names?: string[];
  cover_image_url?: string;
  isbn_13?: string | string[];
  isbn_10?: string | string[];
  pages?: number;
  cached_tags?: unknown;
  release_year?: number | string;
  release_date?: string;
}

export interface HCEdition {
  id: number;
  coverUrl: string;
  isbn: string;
  publisher: string;
}

// ── String utilities ──────────────────────────────────────────────────────

/**
 * Extract the surname from an author name, handling both "First Last" and
 * Goodreads "Last, First" formats.
 */
export function authorLastName(author: string): string {
  const clean = author.replace(/[^a-zA-Z\s''-]/g, "").trim();
  if (author.includes(",")) return (clean.split(/\s+/)[0] ?? "").slice(0, 30);
  const parts = clean.split(/\s+/);
  return (parts[parts.length - 1] ?? "").slice(0, 30);
}

/**
 * Strip series suffix, subtitle, and trailing author pollution so variant
 * titles collapse to a shared canonical form for matching.
 */
export function stripTitle(title: string): string {
  let t = title.trim().replace(/\bvol\.?\b/gi, "Volume");
  t = t.replace(/\s*\([^)]*\)\s*$/, "");
  t = t.replace(/\s*:\s*.+$/, "");
  t = t.replace(/\s+by\s+[A-Z][\w.'\-]+(?:\s+[\w.'\-]+)*$/, "");
  t = t.replace(/,\s+[A-Z][\w.'\-]+(?:\s+[A-Z][\w.'\-]+)+\s*$/, "");
  return t.trim();
}

export function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Validate that an HC-returned title legitimately matches the source title.
 * Accepts exact normalized equality or subtitle-prefix extension. Rejects
 * boxed-set expansions and translated editions (non-ASCII tail).
 */
export function titlesMatch(hcTitle: string, sourceTitle: string): boolean {
  if (!hcTitle || !sourceTitle) return false;
  const hcStripped = stripTitle(hcTitle);
  const sourceStripped = stripTitle(sourceTitle);
  const hc = normTitle(hcStripped);
  const src = normTitle(sourceStripped);
  if (!hc || !src) return false;
  if (hc === src) return true;

  const shorter = hc.length <= src.length ? hc : src;
  const longer = hc.length <= src.length ? src : hc;
  if (!longer.startsWith(shorter) || shorter.length < 6) return false;

  const BOX =
    /\b(boxed? set|box set|omnibus|collection|trilogy|the complete|\d-book)\b/i;
  if (BOX.test(hcTitle) && !BOX.test(sourceTitle)) return false;

  const shortFull =
    hcStripped.length <= sourceStripped.length ? hcStripped : sourceStripped;
  const longFull =
    hcStripped.length <= sourceStripped.length ? sourceStripped : hcStripped;
  const tail = longFull.slice(shortFull.length);
  if (tail.length > 6 && /[^\x00-\x7f]/.test(tail)) return false;

  return true;
}

// ── Edition / tag extractors ──────────────────────────────────────────────

/**
 * Up to 5 genres from HC cached_tags' "Genre" category. Other categories
 * (moods, reader tags like "Loveable Characters") are not genres, so a book
 * without a Genre category gets none.
 */
export function extractGenres(cached_tags: unknown): string[] {
  if (!cached_tags) return [];
  if (Array.isArray(cached_tags)) return cached_tags as string[];
  if (typeof cached_tags !== "object") return [];
  const genre = (cached_tags as Record<string, { tag?: string }[]>).Genre;
  return (genre ?? [])
    .map((t) => t?.tag ?? "")
    .filter(Boolean)
    .slice(0, 5);
}

const DIVERSITY_TAG_KEYS = [
  "Representation",
  "Diverse Voices",
  "Identity",
  "Own Voices",
];

/** Diversity tags from HC representation-category cached tags. */
function extractDiversityTags(book: RawHCBook): string[] {
  const cached = book.cached_tags;
  if (!cached || typeof cached !== "object" || Array.isArray(cached)) return [];
  const obj = cached as Record<string, { tag?: string }[]>;
  const tags = new Set<string>();
  for (const key of DIVERSITY_TAG_KEYS)
    for (const e of obj[key] ?? []) if (e?.tag) tags.add(e.tag);
  return [...tags];
}

export function collectIsbns(
  editions: { isbn_13?: string; isbn_10?: string }[],
): string[] {
  return [
    ...new Set(
      editions
        .flatMap((e) => [e.isbn_13, e.isbn_10])
        .filter((isbn): isbn is string => !!isbn && isbn.length > 0),
    ),
  ];
}

/**
 * Resolve audio_seconds for a book: prefer `default_audio_edition`, fall back
 * to any edition on the book with `audio_seconds > 0`.
 */
export function resolveAudioSeconds(book: RawHCBook): number | null {
  const fromDefault = book.default_audio_edition?.audio_seconds;
  if (fromDefault != null && fromDefault > 0) return fromDefault;
  const fromEdition = book.editions?.find(
    (e) => (e.audio_seconds ?? 0) > 0,
  )?.audio_seconds;
  return fromEdition ?? null;
}

/** Parse a raw HC `books` row into the canonical HCBook shape. */
export function parseBookRow(
  book: RawHCBook,
  fallbackIsbn = "",
): HCBook | null {
  if (!book?.title) return null;
  const editions = book.editions ?? [];
  const defaultEdition = editions.find(
    (e) => e.id === book.default_physical_edition_id,
  );
  const isbns = collectIsbns(editions);
  const primaryIsbn =
    defaultEdition?.isbn_13 ||
    defaultEdition?.isbn_10 ||
    isbns[0] ||
    fallbackIsbn;
  const coverUrl = defaultEdition?.image?.url || book.images?.[0]?.url || "";
  const audioSeconds = resolveAudioSeconds(book);
  const publisher =
    defaultEdition?.publisher?.name ||
    editions.find((e) => e.publisher?.name)?.publisher?.name ||
    "";

  return {
    hardcoverBookId: book.id ?? null,
    title: book.title,
    author: (book.contributions ?? []).map((c) => c.author.name).join(", "),
    coverUrl,
    isbn: primaryIsbn,
    isbns,
    pageCount: book.pages ?? null,
    genres: extractGenres(book.cached_tags),
    diversityTags: extractDiversityTags(book),
    releaseDate: book.release_date ?? "",
    audioDurationMinutes:
      audioSeconds != null ? Math.round(audioSeconds / 60) : null,
    publisher,
  };
}

/** Parse the `results` blob of a HC `search` query into its hit documents. */
export function parseSearchHits(raw: unknown): HardcoverDocument[] {
  if (!raw) return [];
  try {
    const parsed: { hits?: { document: HardcoverDocument }[] } =
      typeof raw === "string" ? JSON.parse(raw) : raw;
    return (parsed?.hits ?? []).map((h) => h.document).filter(Boolean);
  } catch {
    return [];
  }
}

export function docId(doc: HardcoverDocument): number | null {
  const n = typeof doc.id === "string" ? Number(doc.id) : doc.id;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// ── HTTP ──────────────────────────────────────────────────────────────────

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * POST a GraphQL query to Hardcover. Retries on 408 and 5xx with linear
 * backoff. Returns the parsed JSON body, or null on permanent failure /
 * missing token. `revalidate` opts into the Next.js data cache (seconds).
 */
export async function hcPost(
  query: string,
  opts: {
    variables?: Record<string, unknown>;
    logPrefix?: string;
    revalidate?: number;
  } = {},
): Promise<{ data?: Record<string, unknown>; errors?: unknown } | null> {
  const { variables, logPrefix = "[hardcover]", revalidate } = opts;
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) {
    console.warn(`${logPrefix} HARDCOVER_API_TOKEN not set`);
    return null;
  }
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(HC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
      ...(revalidate != null ? { next: { revalidate } } : {}),
    });
    if (res.ok) return res.json();
    const retryable = res.status === 408 || res.status >= 500;
    if (retryable && attempt < MAX_RETRIES) {
      console.warn(
        `${logPrefix} Hardcover ${res.status}, retrying (${attempt + 1}/${MAX_RETRIES})`,
      );
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      continue;
    }
    console.error(`${logPrefix} Hardcover error: ${res.status}`);
    return null;
  }
  return null;
}

// ── Queries ───────────────────────────────────────────────────────────────

const BOOKS_BY_IDS_QUERY = `
  query BooksByIds($ids: [Int!]!) {
    books(where: { id: { _in: $ids } }) { ${BOOK_FIELDS} }
  }
`;

const BOOK_BY_ISBN_QUERY = `
  query BookByIsbn($isbn: String!) {
    books(where: {
      _or: [
        { editions: { isbn_13: { _eq: $isbn } } },
        { editions: { isbn_10: { _eq: $isbn } } }
      ]
    }, limit: 1) { ${BOOK_FIELDS} }
  }
`;

// One top-level field: Hardcover counts each top-level field as a request
// and answers 403 when a query has more than the burst limit allows, so
// batch lookups use `_in` rather than aliased root fields.
const BOOKS_BY_ISBNS_QUERY = `
  query BooksByIsbns($isbns: [String!]!) {
    books(where: {
      _or: [
        { editions: { isbn_13: { _in: $isbns } } },
        { editions: { isbn_10: { _in: $isbns } } }
      ]
    }) { ${BOOK_FIELDS} }
  }
`;

const SEARCH_QUERY = `
  query SearchBooks($query: String!, $perPage: Int!) {
    search(query: $query, query_type: "Book", per_page: $perPage) { results }
  }
`;

const EDITIONS_QUERY = `
  query Editions($id: Int!) {
    books(where: { id: { _eq: $id } }) {
      editions { id isbn_13 isbn_10 image { url } publisher { name } }
    }
  }
`;

/**
 * Fetch full book rows by Hardcover id. Ids Hardcover doesn't have are absent
 * from the map; `null` means the request itself failed.
 */
export async function fetchBooksByIds(
  ids: number[],
  opts: { logPrefix?: string; revalidate?: number } = {},
): Promise<Map<number, HCBook> | null> {
  const out = new Map<number, HCBook>();
  if (!ids.length) return out;
  const json = await hcPost(BOOKS_BY_IDS_QUERY, {
    variables: { ids },
    ...opts,
  });
  if (!json?.data) return null;
  const books = (json.data.books ?? []) as RawHCBook[];
  for (const raw of books) {
    const parsed = parseBookRow(raw);
    if (parsed?.hardcoverBookId != null)
      out.set(parsed.hardcoverBookId, parsed);
  }
  return out;
}

export async function fetchBookById(id: number): Promise<HCBook | null> {
  return (await fetchBooksByIds([id]))?.get(id) ?? null;
}

export async function lookupBookByIsbn(
  isbn: string,
  opts: { revalidate?: number } = {},
): Promise<HCBook | null> {
  const json = await hcPost(BOOK_BY_ISBN_QUERY, {
    variables: { isbn },
    ...opts,
  });
  const raw = (json?.data?.books as RawHCBook[] | undefined)?.[0];
  return raw ? parseBookRow(raw, isbn) : null;
}

/**
 * Every Hardcover book owning any of the given ISBNs, keyed by ISBN, in a
 * single request. `null` means the request failed.
 */
export async function fetchBooksByIsbns(
  isbns: string[],
  opts: { logPrefix?: string } = {},
): Promise<Map<string, RawHCBook[]> | null> {
  const out = new Map<string, RawHCBook[]>();
  const wanted = new Set(isbns.filter(Boolean));
  if (!wanted.size) return out;
  const json = await hcPost(BOOKS_BY_ISBNS_QUERY, {
    variables: { isbns: [...wanted] },
    ...opts,
  });
  if (!json?.data) return null;
  for (const book of (json.data.books ?? []) as RawHCBook[]) {
    for (const e of book.editions ?? []) {
      for (const isbn of [e.isbn_13, e.isbn_10]) {
        if (!isbn || !wanted.has(isbn)) continue;
        const list = out.get(isbn) ?? [];
        if (!list.includes(book)) list.push(book);
        out.set(isbn, list);
      }
    }
  }
  return out;
}

/**
 * Raw search hits (thin documents) in relevance order. `null` means the
 * request failed.
 */
export async function searchDocs(
  query: string,
  perPage: number,
  opts: { logPrefix?: string; revalidate?: number } = {},
): Promise<HardcoverDocument[] | null> {
  const json = await hcPost(SEARCH_QUERY, {
    variables: { query, perPage },
    ...opts,
  });
  if (!json?.data) return null;
  return parseSearchHits(
    (json?.data?.search as { results?: unknown } | undefined)?.results,
  );
}

/** Search, then hydrate every hit with full book data, preserving order. */
export async function searchBooks(
  query: string,
  perPage = 8,
  opts: { revalidate?: number } = {},
): Promise<HCBook[]> {
  const docs = (await searchDocs(query, perPage, opts)) ?? [];
  const ids = docs.map(docId).filter((id): id is number => id != null);
  const full = await fetchBooksByIds(ids, opts);
  return docs
    .map((doc) => {
      const id = docId(doc);
      return (id != null && full?.get(id)) || parseSearchDoc(doc);
    })
    .filter((b) => b.title);
}

/** Best-effort HCBook from a thin search document (no editions/tags). */
export function parseSearchDoc(
  doc: HardcoverDocument,
  fallbackIsbn = "",
): HCBook {
  const rawIsbn13 = Array.isArray(doc.isbn_13) ? doc.isbn_13[0] : doc.isbn_13;
  const rawIsbn10 = Array.isArray(doc.isbn_10) ? doc.isbn_10[0] : doc.isbn_10;
  const isbns = [
    ...new Set([rawIsbn13, rawIsbn10].filter((v): v is string => !!v)),
  ];
  return {
    hardcoverBookId: docId(doc),
    title: doc.title ?? "",
    author: (doc.author_names ?? []).join(", "),
    coverUrl: doc.cover_image_url ?? "",
    isbn: rawIsbn13 || rawIsbn10 || fallbackIsbn,
    isbns,
    pageCount: doc.pages ?? null,
    genres: extractGenres(doc.cached_tags),
    diversityTags: [],
    releaseDate: doc.release_date
      ? String(doc.release_date)
      : doc.release_year
        ? `${doc.release_year}-01-01`
        : "",
    audioDurationMinutes: null,
    publisher: "",
  };
}

/** All editions of a book that have a cover image, deduped by image URL. */
export async function fetchEditions(
  hardcoverBookId: number,
  opts: { revalidate?: number } = {},
): Promise<HCEdition[]> {
  const json = await hcPost(EDITIONS_QUERY, {
    variables: { id: hardcoverBookId },
    ...opts,
  });
  const editions =
    (json?.data?.books as { editions?: RawHCEdition[] }[] | undefined)?.[0]
      ?.editions ?? [];
  const seen = new Set<string>();
  const out: HCEdition[] = [];
  for (const e of editions) {
    const url = e.image?.url;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: e.id ?? 0,
      coverUrl: url,
      isbn: e.isbn_13 || e.isbn_10 || "",
      publisher: e.publisher?.name ?? "",
    });
  }
  return out;
}
