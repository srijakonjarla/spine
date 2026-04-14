import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ readId: string }> }) {
  const supabase = createServerClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { readId } = await params;

  // Verify the read belongs to this user
  const { data: read } = await supabase
    .from("book_reads")
    .select("id")
    .eq("id", readId)
    .eq("user_id", user.id)
    .single();
  if (!read) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await supabase.from("book_reads").delete().eq("id", readId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
