import { NextRequest, NextResponse } from "next/server";
import {
  docId,
  fetchEditions,
  lookupBookByIsbn,
  searchDocs,
} from "@/lib/hardcover.server";

const REVALIDATE_S = 60;

/**
 * GET /api/catalog/editions?hardcoverBookId=…|isbn=…|title=…&author=…
 * Lists a book's cover-bearing editions. Prefers the stored Hardcover id;
 * ISBN and title search are fallbacks for books not yet linked to Hardcover.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cache = { revalidate: REVALIDATE_S };

  let bookId: number | null =
    Number(searchParams.get("hardcoverBookId")) || null;

  const isbn = searchParams.get("isbn") ?? "";
  if (bookId == null && isbn)
    bookId = (await lookupBookByIsbn(isbn, cache))?.hardcoverBookId ?? null;

  const title = searchParams.get("title") ?? "";
  if (bookId == null && title.trim()) {
    const author = searchParams.get("author") ?? "";
    const [hit] = await searchDocs(
      [title, author].filter(Boolean).join(" "),
      5,
      cache,
    );
    bookId = hit ? docId(hit) : null;
  }

  if (bookId == null) return NextResponse.json({ editions: [] });
  return NextResponse.json({ editions: await fetchEditions(bookId, cache) });
}
