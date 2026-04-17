import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [booksRes, listsRes, readingRes, finishedRes, wantRes] =
    await Promise.all([
      supabase
        .from("user_books")
        .select("id, title_override, catalog_books(title)")
        .eq("user_id", user.id)
        .eq("bookmarked", true)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("lists")
        .select("id, title, year")
        .eq("user_id", user.id)
        .eq("bookmarked", true)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("user_books")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "reading"),
      supabase
        .from("user_books")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "finished"),
      supabase
        .from("user_books")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "want-to-read"),
    ]);

  const bookmarks = [
    ...(booksRes.data ?? []).map(
      (b: {
        id: string;
        title_override: string | null;
        catalog_books: { title: string } | { title: string }[] | null;
      }) => {
        const cb = Array.isArray(b.catalog_books)
          ? b.catalog_books[0]
          : b.catalog_books;
        return {
          id: b.id,
          title: b.title_override ?? cb?.title ?? "untitled",
          href: `/book/${b.id}`,
        };
      },
    ),
    ...(listsRes.data ?? []).map(
      (l: { id: string; title: string; year: number }) => ({
        id: l.id,
        title: l.title,
        href: `/${l.year}/lists/${l.id}`,
      }),
    ),
  ];

  return NextResponse.json({
    bookmarks,
    shelfCounts: {
      reading: readingRes.count ?? 0,
      finished: finishedRes.count ?? 0,
      wantToRead: wantRes.count ?? 0,
    },
  });
}
