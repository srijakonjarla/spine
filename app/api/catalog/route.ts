import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const digits = q.replace(/[-\s]/g, "");
  const isIsbn = /^\d{10}$/.test(digits) || /^\d{13}$/.test(digits);
  const formattedQ = isIsbn ? `isbn:${digits}` : q;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(formattedQ)}&maxResults=6&printType=books${key ? `&key=${key}` : ""}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return NextResponse.json([]);

  const json = await res.json();
  const items: GoogleVolume[] = json.items ?? [];

  const results = items.map((item) => {
    const identifiers = item.volumeInfo.industryIdentifiers ?? [];
    const isbn13 = identifiers.find((i) => i.type === "ISBN_13")?.identifier ?? "";
    const isbn10 = identifiers.find((i) => i.type === "ISBN_10")?.identifier ?? "";
    const thumbnail = item.volumeInfo.imageLinks?.thumbnail ?? item.volumeInfo.imageLinks?.smallThumbnail ?? "";
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

  return NextResponse.json(results);
}
