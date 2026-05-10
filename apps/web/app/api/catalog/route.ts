import { NextRequest, NextResponse } from "next/server";
import { upgradeCoverUrl } from "@/lib/coverUrl";

// ── Shared output shape ────────────────────────────────────────────────────
interface BookResult {
  id: string;
  title: string;
  author: string;
  release_date: string;
  genres: string[];
  diversity_tags: string[];
  cover_url: string;
  isbn: string;
  /** All known edition ISBNs (isbn_13 and isbn_10 across all editions). */
  isbns: string[];
  page_count: number | null;
  publisher: string;
  audio_duration_minutes: number | null;
}

// ── Hardcover (primary) ────────────────────────────────────────────────────
interface HardcoverDocument {
  id?: number | string;
  title?: string;
  author_names?: string[];
  cover_image_url?: string;
  isbn_13?: string | string[];
  isbn_10?: string | string[];
  pages?: number;
  cached_tags?: string[] | Record<string, unknown>;
  release_year?: number | string;
  release_date?: string;
}

// Returns the book that owns a given ISBN (isbn_10 or isbn_13), plus ALL its
// editions so we can store every known ISBN for this work.
const HARDCOVER_ISBN_QUERY = `
  query LookupByISBN($isbn: String!) {
    books(where: {
      _or: [
        { editions: { isbn_13: { _eq: $isbn } } },
        { editions: { isbn_10: { _eq: $isbn } } }
      ]
    }, limit: 1) {
      id
      title
      pages
      release_date
      images { url }
      contributions { author { name gender nationality } }
      cached_tags
      default_physical_edition_id
      editions {
        id
        isbn_13
        isbn_10
        image { url }
        audio_seconds
        publisher { name }
      }
    }
  }
`;

const HARDCOVER_SEARCH_QUERY = `
  query SearchBooks($query: String!) {
    search(query: $query, query_type: "Book", per_page: 8) {
      results
    }
  }
`;

const HARDCOVER_DEFAULT_EDITIONS_QUERY = `
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
        audio_seconds
        publisher { name }
      }
    }
  }
`;

async function hcPost(query: string, variables: Record<string, unknown>) {
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) {
    console.warn("[catalog] HARDCOVER_API_TOKEN not set");
    return null;
  }
  console.log("[catalog] POST Hardcover API", JSON.stringify(variables));
  const res = await fetch("https://api.hardcover.app/v1/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    console.error(
      `[catalog] Hardcover API error: ${res.status} ${res.statusText}`,
    );
    return null;
  }
  return res.json();
}

function extractHcTagsForKeys(cached_tags: unknown, keys: string[]): string[] {
  if (
    !cached_tags ||
    typeof cached_tags !== "object" ||
    Array.isArray(cached_tags)
  )
    return [];
  const obj = cached_tags as Record<string, { tag?: string }[]>;
  const results: string[] = [];
  for (const key of keys) {
    const entries = obj[key] ?? [];
    for (const e of entries) {
      if (e?.tag) results.push(e.tag);
    }
  }
  return results;
}

function extractHcGenres(cached_tags: unknown): string[] {
  if (!cached_tags) return [];
  if (Array.isArray(cached_tags)) return cached_tags as string[];
  if (typeof cached_tags === "object") {
    const obj = cached_tags as Record<string, { tag?: string }[]>;
    return Object.values(obj)
      .flat()
      .map((t) => t?.tag ?? "")
      .filter(Boolean)
      .slice(0, 5);
  }
  return [];
}

/** Extract diversity tags from Hardcover representation tags + author identity. */
function extractHcDiversityTags(
  cached_tags: unknown,
  contributions: {
    author: { name: string; gender?: string; nationality?: string };
  }[],
): string[] {
  const tags = new Set<string>();

  // Representation and diversity-related categories from cached_tags
  const repTags = extractHcTagsForKeys(cached_tags, [
    "Representation",
    "Diverse Voices",
    "Identity",
    "Own Voices",
  ]);
  for (const t of repTags) tags.add(t);

  // Author identity fields
  for (const { author } of contributions) {
    if (author.gender) {
      const g = author.gender.toLowerCase();
      if (g === "female" || g === "woman") tags.add("woman author");
      else if (g === "non-binary" || g === "nonbinary" || g === "non binary")
        tags.add("non-binary author");
      else if (g === "male" || g === "man") {
        // Don't add "man author" — not typically a diversity tag
      } else if (g) {
        tags.add(`${g} author`);
      }
    }
    if (author.nationality) {
      tags.add(`${author.nationality} author`);
    }
  }

  return [...tags];
}

/** Parse a raw HC book row (from the `books` table query) into a BookResult. */
function parseHcBook(
  book: {
    id?: number;
    title?: string;
    pages?: number;
    release_date?: string;
    images?: { url?: string }[];
    contributions?: {
      author: { name: string; gender?: string; nationality?: string };
    }[];
    cached_tags?: unknown;
    default_physical_edition_id?: number;
    editions?: {
      id?: number;
      isbn_13?: string;
      isbn_10?: string;
      image?: { url?: string };
      audio_seconds?: number | null;
      publisher?: { name?: string } | null;
    }[];
  },
  fallbackIsbn = "",
): BookResult {
  const editions = book.editions ?? [];
  const contributions = book.contributions ?? [];
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

  // Audio duration: prefer default edition, fall back to any audiobook edition
  const audioEdition =
    defaultEdition ?? editions.find((e) => (e.audio_seconds ?? 0) > 0) ?? null;
  const audioSeconds = audioEdition?.audio_seconds ?? null;

  return {
    id: `hc-${book.id}`,
    title: book.title ?? "",
    author: contributions.map((c) => c.author.name).join(", "),
    release_date: book.release_date ?? "",
    genres: extractHcGenres(book.cached_tags),
    diversity_tags: extractHcDiversityTags(book.cached_tags, contributions),
    cover_url: coverUrl,
    isbn: primaryIsbn,
    isbns,
    page_count: book.pages ?? null,
    publisher: defaultEdition?.publisher?.name ?? "",
    audio_duration_minutes:
      audioSeconds != null ? Math.round(audioSeconds / 60) : null,
  };
}

async function lookupHardcoverByIsbn(isbn: string): Promise<BookResult | null> {
  const json = await hcPost(HARDCOVER_ISBN_QUERY, { isbn });
  const book = json?.data?.books?.[0];
  if (!book?.title) return null;
  return parseHcBook(book, isbn);
}

interface BookEnrichment {
  isbn: string;
  isbns: string[];
  coverUrl: string;
  genres: string[];
  diversityTags: string[];
  publisher: string;
  audioDurationMinutes: number | null;
}

/** Shared helper: collect all isbn_13/isbn_10 values from a list of editions. */
function collectIsbns(
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

async function fetchDefaultEditionData(
  bookIds: number[],
): Promise<Map<number, BookEnrichment>> {
  if (!bookIds.length) return new Map();
  const json = await hcPost(HARDCOVER_DEFAULT_EDITIONS_QUERY, { ids: bookIds });
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
      audio_seconds?: number | null;
      publisher?: { name?: string } | null;
    }[];
  }[] = json?.data?.books ?? [];
  const map = new Map<number, BookEnrichment>();
  for (const book of books) {
    const edition = book.editions.find(
      (e) => e.id === book.default_physical_edition_id,
    );
    const isbns = collectIsbns(book.editions);
    const audioSeconds = edition?.audio_seconds ?? null;
    map.set(book.id, {
      isbn: edition?.isbn_13 || edition?.isbn_10 || isbns[0] || "",
      isbns,
      coverUrl: edition?.image?.url || book.images?.[0]?.url || "",
      genres: extractHcGenres(book.cached_tags),
      diversityTags: extractHcDiversityTags(book.cached_tags, []),
      publisher: edition?.publisher?.name ?? "",
      audioDurationMinutes:
        audioSeconds != null ? Math.round(audioSeconds / 60) : null,
    });
  }
  return map;
}

async function searchHardcover(query: string): Promise<BookResult[]> {
  const json = await hcPost(HARDCOVER_SEARCH_QUERY, { query });
  const raw = json?.data?.search?.results;
  if (!raw) return [];

  const parsed: { hits?: { document: HardcoverDocument }[] } =
    typeof raw === "string" ? JSON.parse(raw) : raw;

  const hits = parsed?.hits ?? [];
  const results = hits
    .map(({ document: d }, i): BookResult & { _bookId?: number } => {
      const bookId = d.id !== undefined ? Number(d.id) : undefined;
      return {
        id: `hc-${d.id ?? i}`,
        title: d.title ?? "",
        author: (d.author_names ?? []).join(", "),
        release_date: d.release_date ?? String(d.release_year ?? ""),
        genres: extractHcGenres(d.cached_tags),
        diversity_tags: [],
        cover_url: d.cover_image_url ?? "",
        isbn: "",
        isbns: [],
        page_count: d.pages ?? null,
        publisher: "",
        audio_duration_minutes: null,
        _bookId: bookId !== undefined && !isNaN(bookId) ? bookId : undefined,
      };
    })
    .filter((b) => b.title);

  // Follow up for reliable ISBN, cover, and genres via default_physical_edition_id
  const bookIds = results
    .map((r) => r._bookId)
    .filter((id): id is number => id !== undefined);
  const enrichMap = await fetchDefaultEditionData(bookIds);
  console.log(
    `[catalog] enrichment follow-up: ${enrichMap.size}/${bookIds.length} resolved`,
  );

  return results.map(({ _bookId, ...r }) => {
    const enrich = _bookId !== undefined ? enrichMap.get(_bookId) : undefined;
    return {
      ...r,
      isbn: enrich?.isbn || r.isbn,
      isbns: enrich?.isbns ?? r.isbns,
      cover_url: enrich?.coverUrl || r.cover_url,
      genres: enrich?.genres?.length ? enrich.genres : r.genres,
      diversity_tags: enrich?.diversityTags?.length
        ? enrich.diversityTags
        : r.diversity_tags,
      publisher: enrich?.publisher ?? r.publisher,
      audio_duration_minutes:
        enrich?.audioDurationMinutes ?? r.audio_duration_minutes,
    };
  });
}

// ── Google Books (fallback) ────────────────────────────────────────────────
interface GoogleVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    categories?: string[];
    pageCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

async function searchGoogle(query: string): Promise<BookResult[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const digits = query.replace(/[-\s]/g, "");
  const isIsbn = /^\d{10}$/.test(digits) || /^\d{13}$/.test(digits);
  const formattedQ = isIsbn ? `isbn:${digits}` : query;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(formattedQ)}&maxResults=6&printType=books${key ? `&key=${key}` : ""}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];

  const json = await res.json();
  const items: GoogleVolume[] = json.items ?? [];

  return items.map((item): BookResult => {
    const identifiers = item.volumeInfo.industryIdentifiers ?? [];
    const isbn13 =
      identifiers.find((i) => i.type === "ISBN_13")?.identifier ?? "";
    const isbn10 =
      identifiers.find((i) => i.type === "ISBN_10")?.identifier ?? "";
    const thumbnail =
      item.volumeInfo.imageLinks?.thumbnail ??
      item.volumeInfo.imageLinks?.smallThumbnail ??
      "";
    return {
      id: item.id,
      title: item.volumeInfo.title ?? "",
      author: (item.volumeInfo.authors ?? []).join(", "),
      release_date: item.volumeInfo.publishedDate ?? "",
      genres: item.volumeInfo.categories ?? [],
      diversity_tags: [],
      cover_url: upgradeCoverUrl(thumbnail.replace(/^http:/, "https:")),
      isbn: isbn13 || isbn10,
      isbns: [isbn13, isbn10].filter(Boolean),
      page_count: item.volumeInfo.pageCount ?? null,
      publisher: "",
      audio_duration_minutes: null,
    };
  });
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const digits = q.replace(/[-\s]/g, "");
  const isIsbn = /^\d{10}$/.test(digits) || /^\d{13}$/.test(digits);

  console.log(`[catalog] GET q="${q}" isIsbn=${isIsbn}`);

  if (isIsbn) {
    const result = await lookupHardcoverByIsbn(digits);
    if (result) {
      console.log(`[catalog] ISBN hit: "${result.title}"`);
      return NextResponse.json([result]);
    }
    console.log(`[catalog] ISBN miss, falling back to text search`);
  }

  const hardcover = await searchHardcover(q);
  if (hardcover.length > 0) {
    console.log(
      `[catalog] Hardcover search returned ${hardcover.length} results`,
    );
    return NextResponse.json(hardcover);
  }

  console.log(
    `[catalog] Hardcover search returned 0 results, falling back to Google Books`,
  );
  const google = await searchGoogle(q);
  console.log(`[catalog] Google Books returned ${google.length} results`);
  return NextResponse.json(google);
}
