import { NextRequest, NextResponse } from "next/server";

// ── Shared output shape ────────────────────────────────────────────────────
interface BookResult {
  id: string;
  title: string;
  author: string;
  release_date: string;
  genres: string[];
  cover_url: string;
  isbn: string;
  /** All known edition ISBNs (isbn_13 and isbn_10 across all editions). */
  isbns: string[];
  page_count: number | null;
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
      contributions { author { name } }
      cached_tags
      default_physical_edition_id
      editions {
        id
        isbn_13
        isbn_10
        image { url }
      }
    }
  }
`;

// Structured title + author lookup — more deterministic than the search endpoint.
const HARDCOVER_TITLE_AUTHOR_QUERY = `
  query LookupByTitleAuthor($title: String!, $author: String!) {
    books(where: {
      title: { _ilike: $title },
      contributions: { author: { name: { _ilike: $author } } }
    }, limit: 3) {
      id
      title
      pages
      release_date
      images { url }
      contributions { author { name } }
      cached_tags
      default_physical_edition_id
      editions {
        id
        isbn_13
        isbn_10
        image { url }
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

/** Parse a raw HC book row (from the `books` table query) into a BookResult. */
function parseHcBook(
  book: {
    id?: number;
    title?: string;
    pages?: number;
    release_date?: string;
    images?: { url?: string }[];
    contributions?: { author: { name: string } }[];
    cached_tags?: unknown;
    default_physical_edition_id?: number;
    editions?: { id?: number; isbn_13?: string; isbn_10?: string; image?: { url?: string } }[];
  },
  fallbackIsbn = "",
): BookResult {
  const editions = book.editions ?? [];
  const defaultEdition = editions.find((e) => e.id === book.default_physical_edition_id);
  const isbns = collectIsbns(editions);
  const primaryIsbn = defaultEdition?.isbn_13 || defaultEdition?.isbn_10 || isbns[0] || fallbackIsbn;
  const coverUrl = defaultEdition?.image?.url || book.images?.[0]?.url || "";
  return {
    id: `hc-${book.id}`,
    title: book.title ?? "",
    author: (book.contributions ?? [])
      .map((c) => c.author.name)
      .join(", "),
    release_date: book.release_date ?? "",
    genres: extractHcGenres(book.cached_tags),
    cover_url: coverUrl,
    isbn: primaryIsbn,
    isbns,
    page_count: book.pages ?? null,
  };
}

async function lookupHardcoverByIsbn(isbn: string): Promise<BookResult | null> {
  const json = await hcPost(HARDCOVER_ISBN_QUERY, { isbn });
  const book = json?.data?.books?.[0];
  if (!book?.title) return null;
  return parseHcBook(book, isbn);
}

async function lookupHardcoverByTitleAuthor(
  title: string,
  author: string,
): Promise<BookResult | null> {
  const json = await hcPost(HARDCOVER_TITLE_AUTHOR_QUERY, {
    title: `%${title}%`,
    author: `%${author}%`,
  });
  const books: typeof json.data.books = json?.data?.books ?? [];
  if (!books.length) return null;

  // Prefer an exact title match; otherwise take first result
  const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nt = normTitle(title);
  const best =
    books.find((b: { title?: string }) => normTitle(b.title ?? "") === nt) ??
    books[0];
  return parseHcBook(best);
}

interface BookEnrichment {
  isbn: string;
  isbns: string[];
  coverUrl: string;
  genres: string[];
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
    }[];
  }[] = json?.data?.books ?? [];
  const map = new Map<number, BookEnrichment>();
  for (const book of books) {
    const edition = book.editions.find(
      (e) => e.id === book.default_physical_edition_id,
    );
    const isbns = collectIsbns(book.editions);
    map.set(book.id, {
      isbn: edition?.isbn_13 || edition?.isbn_10 || isbns[0] || "",
      isbns,
      coverUrl: edition?.image?.url || book.images?.[0]?.url || "",
      genres: extractHcGenres(book.cached_tags),
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
        cover_url: d.cover_image_url ?? "",
        isbn: "",
        isbns: [],
        page_count: d.pages ?? null,
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
      cover_url: thumbnail.replace(/^http:/, "https:"),
      isbn: isbn13 || isbn10,
      isbns: [isbn13, isbn10].filter(Boolean),
      page_count: item.volumeInfo.pageCount ?? null,
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
    console.log(`[catalog] Hardcover search returned ${hardcover.length} results`);
    return NextResponse.json(hardcover);
  }

  console.log(`[catalog] Hardcover search returned 0 results, falling back to Google Books`);
  const google = await searchGoogle(q);
  console.log(`[catalog] Google Books returned ${google.length} results`);
  return NextResponse.json(google);
}
