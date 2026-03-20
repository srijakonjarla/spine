import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id: bookId } = await params;
  const { thought } = await req.json();

  const { error } = await supabase.rpc("add_thought", {
    p_id:         thought.id,
    p_book_id:    bookId,
    p_text:       thought.text,
    p_created_at: thought.createdAt,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id: bookId } = await params;
  const { thoughtId } = await req.json();

  const { error } = await supabase.rpc("remove_thought", {
    p_thought_id: thoughtId,
    p_book_id:    bookId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
