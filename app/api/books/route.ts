import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const year   = searchParams.get("year");
  const limit  = searchParams.get("limit");
  const offset = searchParams.get("offset");

  let query = supabase
    .from("books")
    .select("*, thoughts(*), book_reads(*)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (year) {
    const y = Number(year);
    const start = `${y}-01-01`;
    const end = `${y + 1}-01-01`;
    query = query.or(
      `and(created_at.gte.${start},created_at.lt.${end}),` +
      `and(date_finished.gte.${start},date_finished.lt.${end}),` +
      `and(date_started.gte.${start},date_started.lt.${end}),` +
      `and(date_shelved.gte.${start},date_shelved.lt.${end})`
    );
  }

  if (limit)  query = query.limit(Number(limit));
  if (offset) query = query.range(Number(offset), Number(offset) + Number(limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (limit) return NextResponse.json({ data, total: count });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { entry } = await req.json();

  const { error } = await supabase.from("books").insert({
    id: entry.id,
    user_id: user.id,
    title: entry.title ?? "",
    author: entry.author ?? "",
    release_date: entry.releaseDate ?? "",
    genres: entry.genres ?? [],
    cover_url: entry.coverUrl ?? "",
    isbn: entry.isbn ?? "",
    page_count: entry.pageCount ?? null,
    status: entry.status,
    date_started: entry.dateStarted || null,
    date_finished: entry.dateFinished || null,
    date_shelved: entry.dateShelved || null,
    rating: entry.rating,
    feeling: entry.feeling,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
