import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { autoLogToday } from "@/lib/autoLog";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id: bookId } = await params;
  const { entry } = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.rpc("start_new_read", {
    p_book_id:      bookId,
    p_status:       entry.status,
    p_date_started: entry.dateStarted || null,
    p_date_finished: entry.dateFinished || null,
    p_date_shelved: entry.dateShelved || null,
    p_rating:       entry.rating,
    p_feeling:      entry.feeling,
    p_created_at:   entry.createdAt,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await autoLogToday(supabase, user.id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
