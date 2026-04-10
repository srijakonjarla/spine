import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id } = await params;
  const { data, error } = await supabase
    .from("books")
    .select("*, thoughts(*), book_reads(*)")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id } = await params;
  const patch = await req.json();

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title"        in patch) row.title        = patch.title;
  if ("author"       in patch) row.author        = patch.author;
  if ("genres"       in patch) row.genres        = patch.genres;
  if ("status"       in patch) row.status        = patch.status;
  if ("dateStarted"  in patch) row.date_started  = patch.dateStarted  || null;
  if ("dateFinished" in patch) row.date_finished = patch.dateFinished || null;
  if ("dateShelved"  in patch) row.date_shelved  = patch.dateShelved  || null;
  if ("rating"       in patch) row.rating        = patch.rating;
  if ("feeling"      in patch) row.feeling       = patch.feeling;
  if ("bookmarked"   in patch) row.bookmarked    = patch.bookmarked;
  if ("moodTags"     in patch) row.mood_tags     = patch.moodTags;

  const { error } = await supabase.from("books").update(row).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id } = await params;
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
