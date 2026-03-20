import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const year = req.nextUrl.searchParams.get("year");
  if (!year) return NextResponse.json({ error: "year required" }, { status: 400 });

  const { data, error } = await supabase
    .from("reading_log")
    .select("*")
    .gte("log_date", `${year}-01-01`)
    .lte("log_date", `${year}-12-31`)
    .order("log_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { date } = await req.json();

  const { data: existing } = await supabase
    .from("reading_log")
    .select("id")
    .eq("log_date", date)
    .maybeSingle();

  if (existing) {
    await supabase.from("reading_log").delete().eq("id", existing.id);
    return NextResponse.json({ result: "removed" });
  } else {
    await supabase.from("reading_log").insert({ log_date: date });
    return NextResponse.json({ result: "added" }, { status: 201 });
  }
}
