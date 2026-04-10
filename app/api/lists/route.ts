import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const year = req.nextUrl.searchParams.get("year");
  if (!year) return NextResponse.json({ error: "year required" }, { status: 400 });

  const { data, error } = await supabase
    .from("lists")
    .select("*, list_items(*)")
    .eq("year", Number(year))
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { year, title, listType, dateLabel, notesLabel } = await req.json();

  const { data, error } = await supabase
    .from("lists")
    .insert({
      year,
      title,
      list_type: listType ?? "general",
      date_label: dateLabel ?? "",
      notes_label: notesLabel ?? "notes",
    })
    .select("*, list_items(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
