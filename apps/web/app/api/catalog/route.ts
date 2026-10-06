import { NextRequest, NextResponse } from "next/server";
import { upgradeCoverUrl } from "@/lib/coverUrl";
import {
  type HCBook,
  lookupBookByIsbn,
  searchBooks,
} from "@/lib/hardcover.server";

// Search hits are not persisted; the Next data cache absorbs repeat queries.
const SEARCH_REVALIDATE_S = 60;

interface BookResult {
  id: string;
  /** Hardcover books.id — null for Google Books fallback results. */
  hardcover_book_id: number | null;
  title: string;
  author: string;
  release_date: string;
  genres: string[];
  diversity_tags: string[];
  cover_url: string;
  isbn: string;
  isbns: string[];
  page_count: number | null;
  publisher: string;
  audio_duration_minutes: number | null;
}

function fromHardcover(b: HCBook, i: number): BookResult {
  return {
    id: `hc-${b.hardcoverBookId ?? i}`,
    hardcover_book_id: b.hardcoverBookId,
    title: b.title,
    author: b.author,
    release_date: b.releaseDate,
    genres: b.genres,
    diversity_tags: b.diversityTags,
    cover_url: b.coverUrl,
    isbn: b.isbn,
    isbns: b.isbns,
    page_count: b.pageCount,
    publisher: b.publisher,
    audio_duration_minutes: b.audioDurationMinutes,
  };
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

  const res = await fetch(url, { next: { revalidate: SEARCH_REVALIDATE_S } });
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
      hardcover_book_id: null,
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
  const cache = { revalidate: SEARCH_REVALIDATE_S };

  if (isIsbn) {
    const hit = await lookupBookByIsbn(digits, cache);
    if (hit) return NextResponse.json([fromHardcover(hit, 0)]);
  }

  const hardcover = await searchBooks(q, 8, cache);
  if (hardcover.length) return NextResponse.json(hardcover.map(fromHardcover));

  return NextResponse.json(await searchGoogle(q));
}
