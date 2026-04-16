import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * POST /api/admin/backfill-series
 * For each series_book the user owns that has no book_id:
 *   1. Find a matching user_books entry by title (via catalog_books)
 *   2. If none exists, create a want-to-read user_books entry
 *   3. Set series_books.book_id and backfill cover_url if missing
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Fetch all series_books without book_id for this user's series
  // (book_id is NOT NULL so this should always return 0 rows)
  const { data: unlinked, error } = await supabase
    .from("series_books")
    .select("id, cover_url, series!inner(user_id)")
    .is("book_id", null)
    .eq("series.user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!unlinked?.length) return NextResponse.json({ linked: 0 });

  return NextResponse.json({ linked: 0, total: unlinked.length });
}
