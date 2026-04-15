import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { upsertBookForUser } from "@/lib/bookUpsert.server";

interface CatalogMeta {
  coverUrl?: string;
  author?: string;
  isbn?: string;
  releaseDate?: string;
  genres?: string[];
  pageCount?: number | null;
  bookId?: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: seriesId } = await params;

  const { data: series } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", user.id)
    .single();
  if (!series) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { title, position, catalog, status } = await req.json() as {
    title: string;
    position: number;
    catalog?: CatalogMeta;
    status?: string;
  };
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const VALID_STATUSES = ["unread", "reading", "read", "skipped"];
  const resolvedStatus = VALID_STATUSES.includes(status ?? "") ? status! : "unread";
  const coverUrl = catalog?.coverUrl ?? "";

  // Resolve user_books.id — find existing entry or create a TBR book
  let bookId: string | null = catalog?.bookId ?? null;

  if (!bookId) {
    // Check by ISBN first (most reliable match)
    if (catalog?.isbn) {
      const { data: byIsbn } = await supabase
        .from("user_books")
        .select("id")
        .eq("user_id", user.id)
        .eq("catalog_books.isbn", catalog.isbn)
        .maybeSingle();
      if (byIsbn) bookId = byIsbn.id;
    }

    // Fall back to title match
    if (!bookId) {
      const { data: byTitle } = await supabase
        .from("user_books")
        .select("id")
        .eq("user_id", user.id)
        .ilike("catalog_books.title", title.trim())
        .maybeSingle();
      if (byTitle) bookId = byTitle.id;
    }

    // Not in library — create a TBR entry (catalog + user_books)
    if (!bookId) {
      const now = new Date().toISOString();
      const result = await upsertBookForUser(
        supabase,
        user.id,
        {
          title:        title.trim(),
          author:       catalog?.author       ?? "",
          cover_url:    coverUrl,
          isbn:         catalog?.isbn         ?? "",
          release_date: catalog?.releaseDate  ?? "",
          genres:       catalog?.genres       ?? [],
          page_count:   catalog?.pageCount    ?? null,
        },
        {
          status:       "want-to-read",
          date_shelved: now.slice(0, 10),
          bookmarked:   false,
          created_at:   now,
          updated_at:   now,
        },
      );
      if (result) bookId = result.userBookId;
    }
  }

  const { data, error } = await supabase
    .from("series_books")
    .insert({
      series_id: seriesId,
      title:     title.trim(),
      position,
      cover_url: coverUrl,
      status:    resolvedStatus,
      book_id:   bookId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
