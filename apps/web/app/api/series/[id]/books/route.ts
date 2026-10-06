import { NextRequest, NextResponse } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";
import { upsertBookForUser } from "@/lib/bookUpsert.server";

interface CatalogMeta {
  hardcoverBookId?: number | null;
  coverUrl?: string;
  author?: string;
  isbn?: string;
  releaseDate?: string;
  genres?: string[];
  pageCount?: number | null;
  bookId?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: seriesId } = await params;

  const { data: series } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", userId)
    .single();
  if (!series)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const { title, position, catalog, status } = (await req.json()) as {
    title: string;
    position: number;
    catalog?: CatalogMeta;
    status?: string;
  };
  if (!title?.trim())
    return NextResponse.json({ error: "title required" }, { status: 400 });

  const VALID_STATUSES = ["unread", "reading", "read", "skipped"];
  const resolvedStatus = VALID_STATUSES.includes(status ?? "")
    ? status!
    : "unread";

  // Resolve user_books.id — find existing entry or create a TBR book
  let bookId: string | null = catalog?.bookId ?? null;

  if (!bookId) {
    // Not in the library yet — add it as a TBR entry.
    const now = new Date().toISOString();
    const result = await upsertBookForUser(
      supabase,
      userId,
      {
        hardcover_book_id: catalog?.hardcoverBookId ?? null,
        title: title.trim(),
        author: catalog?.author ?? "",
        cover_url: catalog?.coverUrl ?? "",
        isbns: catalog?.isbn ? [catalog.isbn] : [],
        release_date: catalog?.releaseDate ?? "",
        genres: catalog?.genres ?? [],
        page_count: catalog?.pageCount ?? null,
        publisher: "",
        audio_duration_minutes: null,
      },
      {
        status: "want-to-read",
        date_shelved: now.slice(0, 10),
        bookmarked: false,
        created_at: now,
        updated_at: now,
      },
      { verified: false },
    );
    if (result) bookId = result.userBookId;
  }

  if (!bookId)
    return NextResponse.json(
      { error: "could not resolve book — upsert failed" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("series_books")
    .insert({
      series_id: seriesId,
      position,
      status: resolvedStatus,
      book_id: bookId,
    })
    .select("id, position, status, book_id")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, title: title.trim() }, { status: 201 });
}
