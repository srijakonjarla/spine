import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { syncBookSeries } from "@/lib/seriesSync.server";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { offset = 0, limit = 20 } = await req.json().catch(() => ({}));

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author, status, cover_url")
    .eq("user_id", user.id)
    .in("status", ["finished", "reading"])
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!books?.length) return NextResponse.json({ synced: 0, remaining: 0 });

  let synced = 0;
  for (const book of books) {
    const before = await countSeriesBooks(supabase, user.id, book.title);
    await syncBookSeries(supabase, user.id, {
      id: book.id,
      title: book.title,
      author: book.author,
      status: book.status,
      coverUrl: book.cover_url ?? "",
    });
    const after = await countSeriesBooks(supabase, user.id, book.title);
    if (after > before) synced++;
    await sleep(1200);
  }

  const { count: remaining } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["finished", "reading"])
    .range(offset + limit, offset + limit + 9999);

  return NextResponse.json({ synced, remaining: remaining ?? 0 });
}

async function countSeriesBooks(
  supabase: Parameters<typeof syncBookSeries>[0],
  userId: string,
  title: string
): Promise<number> {
  const { count } = await supabase
    .from("series_books")
    .select("id", { count: "exact", head: true })
    .ilike("title", title);
  void userId;
  return count ?? 0;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
