import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase-server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ readId: string }> }) {
  const supabase = createServerClient(req);
  const { readId } = await params;
  const { error } = await supabase.from("book_reads").delete().eq("id", readId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
