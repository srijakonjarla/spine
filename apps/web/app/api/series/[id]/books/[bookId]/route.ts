import { NextRequest, NextResponse } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bookId: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { bookId } = await params;

  // Verify the series_book's parent series belongs to this user
  const { data: seriesBook } = await supabase
    .from("series_books")
    .select("id, series!inner(user_id)")
    .eq("id", bookId)
    .eq("series.user_id", userId)
    .single();
  if (!seriesBook)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const { status } = await req.json();
  const { error } = await supabase
    .from("series_books")
    .update({ status })
    .eq("id", bookId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bookId: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { bookId } = await params;

  // Verify the series_book's parent series belongs to this user
  const { data: seriesBook } = await supabase
    .from("series_books")
    .select("id, series!inner(user_id)")
    .eq("id", bookId)
    .eq("series.user_id", userId)
    .single();
  if (!seriesBook)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await supabase
    .from("series_books")
    .delete()
    .eq("id", bookId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
