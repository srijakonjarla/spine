import { NextRequest, NextResponse } from "next/server";

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    categories?: string[];
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6&printType=books${key ? `&key=${key}` : ""}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return NextResponse.json([]);

  const json = await res.json();
  const items: GoogleVolume[] = json.items ?? [];

  const results = items.map((item) => ({
    id: item.id,
    title: item.volumeInfo.title ?? "",
    author: (item.volumeInfo.authors ?? []).join(", "),
    release_date: item.volumeInfo.publishedDate ?? "",
    genres: item.volumeInfo.categories ?? [],
  }));

  return NextResponse.json(results);
}
