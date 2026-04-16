import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { autoLogToday } from "@/lib/autoLog";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bookId = req.nextUrl.searchParams.get("bookId");

  let query = supabase
    .from("quotes")
    .select("*, user_books(title_override, catalog_books(title))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (bookId) query = query.eq("book_id", bookId);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { text, pageNumber, bookId } = await req.json();
  if (!text?.trim())
    return NextResponse.json({ error: "text required" }, { status: 400 });

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      user_id: user.id,
      text: text.trim(),
      page_number: pageNumber ?? "",
      book_id: bookId ?? null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await autoLogToday(supabase, user.id);
  return NextResponse.json(data, { status: 201 });
}
