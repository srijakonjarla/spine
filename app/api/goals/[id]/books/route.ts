import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: goalId } = await params;
  const { bookId } = await req.json();
  if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

  const { error } = await supabase
    .from("goal_books")
    .insert({ goal_id: goalId, book_id: bookId, user_id: user.id });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
