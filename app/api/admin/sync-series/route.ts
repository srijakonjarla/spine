import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { syncBookSeries } from "@/lib/seriesSync.server";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { offset = 0, limit = 20 } = await req.json().catch(() => ({}));

  const { data: userBooks, error } = await supabase
    .from("user_books")
    .select(
      "id, status, title_override, author_override, catalog_books(title, author, cover_url)",
    )
    .eq("user_id", user.id)
    .in("status", ["finished", "reading"])
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!userBooks?.length) return NextResponse.json({ synced: 0, remaining: 0 });

  let synced = 0;
  for (const ub of userBooks) {
    const cb = ub.catalog_books as unknown as {
      title: string;
      author: string;
      cover_url: string;
    } | null;
    const title = ub.title_override ?? cb?.title ?? "";
    const author = ub.author_override ?? cb?.author ?? "";
    const book = {
      id: ub.id,
      title,
      author,
      status: ub.status,
      coverUrl: cb?.cover_url ?? "",
    };
    const before = await countSeriesBooks(supabase, user.id, book.id);
    await syncBookSeries(supabase, user.id, book);
    const after = await countSeriesBooks(supabase, user.id, book.id);
    if (after > before) synced++;
    await sleep(1200);
  }

  const { count: remaining } = await supabase
    .from("user_books")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["finished", "reading"])
    .range(offset + limit, offset + limit + 9999);

  return NextResponse.json({ synced, remaining: remaining ?? 0 });
}

async function countSeriesBooks(
  supabase: Parameters<typeof syncBookSeries>[0],
  userId: string,
  bookId: string,
): Promise<number> {
  void userId;
  const { count } = await supabase
    .from("series_books")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId);
  return count ?? 0;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
