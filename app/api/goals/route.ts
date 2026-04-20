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
    .from("reading_goals")
    .select("*, goal_books(book_id)")
    .eq("user_id", userId)
    .eq("year", Number(year))
    .order("created_at");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { year, target, name, is_auto } = await req.json();
  if (!year || !target)
    return NextResponse.json(
      { error: "year and target required" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("reading_goals")
    .insert({
      user_id: userId,
      year,
      target,
      name: name ?? "",
      is_auto: is_auto ?? false,
    })
    .select("*, goal_books(book_id)")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
