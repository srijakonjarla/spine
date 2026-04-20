/**
 * Shared Hardcover GraphQL helpers for admin routes (backfill, goodreads import).
 *
 * Keeps `BOOK_FIELDS`, the `RawHCBook` shape, string utilities (`stripTitle`,
 * `titlesMatch`, `authorLastName`, ...), and the POST client in one place so
 * both routes stay in lockstep.
 */

const HC_ENDPOINT = "https://api.hardcover.app/v1/graphql";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/** Shared field selection for both ISBN-path and search-path follow-up queries. */
export const BOOK_FIELDS = `
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

export interface RawHCBook {
  id?: number;
  title?: string;
  pages?: number;
  release_date?: string;
  images?: { url?: string }[];
  contributions?: { author: { name: string } }[];
  cached_tags?: unknown;
  default_physical_edition_id?: number;
  editions?: {
    id?: number;
    isbn_13?: string;
    isbn_10?: string;
    image?: { url?: string };
    publisher?: { name?: string } | null;
    audio_seconds?: number | null;
  }[];
  default_audio_edition_id?: number | null;
  default_audio_edition?: { audio_seconds?: number | null } | null;
}

export interface HCBook {
  title: string;
  author: string;
  coverUrl: string;
  isbn: string;
  isbns: string[];
  pageCount: number | null;
  genres: string[];
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

// ── String utilities ──────────────────────────────────────────────────────

/** Sanitize a string for safe inline embedding in a GQL query literal. */
export function gqlStr(s: string, maxLen = 120): string {
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

export function extractGenres(cached_tags: unknown): string[] {
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

/**
 * Parse a raw HC `books` row into the canonical HCBook shape. Returns null if
 * the book lacks a title. `bookId` piggybacks on the return so callers can
 * thread it into follow-up queries without a second parse.
 */
export function parseBookRow(
  book: RawHCBook,
  fallbackIsbn = "",
): (HCBook & { bookId: number }) | null {
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
    title: book.title,
    author: (book.contributions ?? []).map((c) => c.author.name).join(", "),
    coverUrl,
    isbn: primaryIsbn,
    isbns,
    pageCount: book.pages ?? null,
    genres: extractGenres(book.cached_tags),
    releaseDate: book.release_date ?? "",
    audioDurationMinutes:
      audioSeconds != null ? Math.round(audioSeconds / 60) : null,
    publisher,
    bookId: book.id!,
  };
}

// ── HTTP ──────────────────────────────────────────────────────────────────

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * POST a GraphQL query to Hardcover. Retries on 408 and 5xx with linear
 * backoff. Returns the parsed JSON body, or null on permanent failure /
 * missing token.
 */
export async function hcPost(
  query: string,
  logPrefix = "[hardcover]",
): Promise<{ data?: Record<string, unknown>; errors?: unknown } | null> {
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
      body: JSON.stringify({ query }),
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
