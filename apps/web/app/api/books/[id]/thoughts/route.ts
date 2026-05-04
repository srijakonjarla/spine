import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase-server";
import { autoLogToday } from "@/lib/autoLog";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const { id: bookId } = await params;
  const { thought } = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.rpc("add_thought", {
    p_id: thought.id,
    p_book_id: bookId,
    p_text: thought.text,
    p_created_at: thought.createdAt,
    p_page_number: thought.pageNumber ?? null,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await autoLogToday(supabase, user.id);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: bookId } = await params;
  const { thoughtId } = await req.json();

  // Verify the book belongs to this user before removing the thought
  const { data: book } = await supabase
    .from("user_books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();
  if (!book) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await supabase.rpc("remove_thought", {
    p_thought_id: thoughtId,
    p_book_id: bookId,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
