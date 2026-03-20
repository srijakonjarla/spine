import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const { searchParams } = req.nextUrl;
  const year      = searchParams.get("year");
  const catalogId = searchParams.get("catalogId");
  const limit     = searchParams.get("limit");
  const offset    = searchParams.get("offset");

  let query = supabase
    .from("books")
    .select("*, book_catalog(title, author, genres), thoughts(*), book_reads(*)")
    .order("updated_at", { ascending: false });

  // Single-book lookup by catalog ID
  if (catalogId) {
    const { data, error } = await query.eq("catalog_id", catalogId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Year filter
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

  // Pagination
  if (limit)  query = query.limit(Number(limit));
  if (offset) query = query.range(Number(offset), Number(offset) + Number(limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Include total count when paginating so clients know if more pages exist
  if (limit) {
    return NextResponse.json({ data, total: count });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { entry, catalogId } = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("books").insert({
    id: entry.id,
    status: entry.status,
    date_started: entry.dateStarted || null,
    date_finished: entry.dateFinished || null,
    date_shelved: entry.dateShelved || null,
    rating: entry.rating,
    feeling: entry.feeling,
    catalog_id: catalogId,
    user_id: user?.id ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
