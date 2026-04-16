import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * POST /api/catalog/upsert
 * Upserts a book into catalog_books (deduped by ISBN when present) and returns
 * the catalog_books UUID. Does NOT create a user_books entry.
 * Used when linking a list item to a catalog book for cover display.
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { title, author, coverUrl, isbn, releaseDate, genres, pageCount } = await req.json();

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  // Try to find by ISBN first
  if (isbn) {
    const { data: existing } = await supabase
      .from("catalog_books")
      .select("id")
      .eq("isbn", isbn)
      .maybeSingle();
    if (existing) return NextResponse.json({ id: existing.id });
  }

  // Insert new catalog entry
  const { data, error } = await supabase
    .from("catalog_books")
    .insert({
      title: title ?? "",
      author: author ?? "",
      cover_url: coverUrl ?? "",
      isbn: isbn ?? "",
      release_date: releaseDate ?? "",
      genres: genres ?? [],
      page_count: pageCount ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
