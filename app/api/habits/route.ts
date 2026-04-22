import { NextRequest, NextResponse } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const year = req.nextUrl.searchParams.get("year");
  if (!year)
    return NextResponse.json({ error: "year required" }, { status: 400 });

  const { data, error } = await supabase
    .from("reading_log")
    .select("id, user_id, log_date, note, logged")
    .eq("user_id", userId)
    .gte("log_date", `${year}-01-01`)
    .lte("log_date", `${year}-12-31`)
    .order("log_date", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { date } = await req.json();

  const { data: existing } = await supabase
    .from("reading_log")
    .select("id, logged")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();

  if (existing && existing.logged) {
    // Row exists and is logged — unlog it (keep the row if it has a note)
    await supabase
      .from("reading_log")
      .update({ logged: false })
      .eq("id", existing.id);
    return NextResponse.json({ result: "removed" });
  } else if (existing) {
    // Row exists but not logged (note-only) — mark as logged
    await supabase
      .from("reading_log")
      .update({ logged: true })
      .eq("id", existing.id);
    return NextResponse.json({ result: "added" }, { status: 200 });
  } else {
    await supabase
      .from("reading_log")
      .insert({ user_id: userId, log_date: date, logged: true });
    return NextResponse.json({ result: "added" }, { status: 201 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { date, note } = await req.json();
  if (!date)
    return NextResponse.json({ error: "date required" }, { status: 400 });

  // Ensure the row exists (upsert), then set the note.
  // Note-only entries default to logged=false so they don't count as reading days.
  const { data: existing } = await supabase
    .from("reading_log")
    .select("id")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("reading_log")
        .update({ note: note ?? "" })
        .eq("id", existing.id)
    : await supabase.from("reading_log").insert({
        user_id: userId,
        log_date: date,
        note: note ?? "",
        logged: false,
      });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
