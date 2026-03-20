import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("book_catalog")
    .select("*")
    .or(`title.ilike.%${q}%,author.ilike.%${q}%`)
    .order("title")
    .limit(6);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { title, author, releaseDate, genres } = await req.json();

  const { data: existing } = await supabase
    .from("book_catalog")
    .select("*")
    .ilike("title", title)
    .ilike("author", author || "%")
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (genres?.length) {
      const merged = Array.from(new Set([...(existing.genres ?? []), ...genres]));
      if (merged.length > (existing.genres ?? []).length) {
        await supabase.from("book_catalog").update({ genres: merged }).eq("id", existing.id);
        return NextResponse.json({ ...existing, genres: merged });
      }
    }
    return NextResponse.json(existing);
  }

  const { data, error } = await supabase
    .from("book_catalog")
    .insert({ title, author: author ?? "", release_date: releaseDate ?? "", genres: genres ?? [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
