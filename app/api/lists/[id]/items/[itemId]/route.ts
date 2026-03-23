import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const supabase = createServerClient(req);
  const { itemId } = await params;
  const patch = await req.json();

  const row: Record<string, string> = {};
  if (patch.releaseDate !== undefined) row.item_date = patch.releaseDate;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (Object.keys(row).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("list_items").update(row).eq("id", itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const supabase = createServerClient(req);
  const { id: listId, itemId } = await params;

  const { error } = await supabase.from("list_items").delete().eq("id", itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("lists").update({ updated_at: new Date().toISOString() }).eq("id", listId);
  return NextResponse.json({ ok: true });
}
