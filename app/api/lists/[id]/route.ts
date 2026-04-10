import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id } = await params;
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_items(*)")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id } = await params;
  const patch = await req.json();

  const row: Record<string, string> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.dateLabel !== undefined) row.date_label = patch.dateLabel;
  if (patch.notesLabel !== undefined) row.notes_label = patch.notesLabel;
  if (patch.bookmarked !== undefined) row.bookmarked = patch.bookmarked;

  const { error } = await supabase.from("lists").update(row).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id } = await params;
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
