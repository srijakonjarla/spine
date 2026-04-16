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

const HARDCOVER_ISBN_QUERY = `
  query LookupByISBN($isbn: String!) {
    editions(where: {
      _or: [
        { isbn_10: { _eq: $isbn } },
        { isbn_13: { _eq: $isbn } }
      ]
    }, limit: 1) {
      isbn_10
      isbn_13
      image { url }
      book {
        id
        title
        pages
        release_date
        images { url }
        contributions { author { name } }
        cached_tags
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

async function lookupHardcoverByIsbn(isbn: string): Promise<BookResult | null> {
  const json = await hcPost(HARDCOVER_ISBN_QUERY, { isbn });
  const edition = json?.data?.editions?.[0];
  if (!edition?.book) return null;

  const { book } = edition;
  return {
    id: `hc-${book.id}`,
    title: book.title ?? "",
    author: (book.contributions ?? [])
      .map((c: { author: { name: string } }) => c.author.name)
      .join(", "),
    release_date: book.release_date ?? "",
    genres: extractHcGenres(book.cached_tags),
    cover_url: edition.image?.url || book.images?.[0]?.url || "",
    isbn: edition.isbn_13 || edition.isbn_10 || isbn,
    page_count: book.pages ?? null,
  };
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
    map.set(book.id, {
      isbn: edition?.isbn_13 || edition?.isbn_10 || "",
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
    console.log(`[catalog] Hardcover returned ${hardcover.length} results`);
    return NextResponse.json(hardcover);
  }

  console.log(
    `[catalog] Hardcover returned 0 results, falling back to Google Books`,
  );
  const google = await searchGoogle(q);
  console.log(`[catalog] Google Books returned ${google.length} results`);
  return NextResponse.json(google);
}
