import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const year = req.nextUrl.searchParams.get("year");
  if (!year)
    return NextResponse.json({ error: "year required" }, { status: 400 });

  const { data, error } = await supabase
    .from("lists")
    .select(
      "*, list_items(*, user_books(title_override, catalog_books(title, cover_url)))",
    )
    .eq("user_id", user.id)
    .eq("year", Number(year))
    .order("sort_order", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const {
    year,
    title,
    listType,
    color,
    emoji,
    bulletSymbol,
    description,
    dateLabel,
    notesLabel,
  } = await req.json();

  const { data, error } = await supabase
    .from("lists")
    .insert({
      user_id: user.id,
      year,
      title,
      list_type: listType ?? "book_list",
      color: color ?? "plum",
      emoji: emoji ?? "Books",
      bullet_symbol: bulletSymbol ?? "→",
      description: description ?? "",
      date_label: dateLabel ?? "",
      notes_label: notesLabel ?? "notes",
    })
    .select(
      "*, list_items(*, user_books(title_override, catalog_books(title, cover_url)))",
    )
    .single();

  if (error) {
    // Partial unique index `lists_one_singleton_per_year` enforces
    // one library_loan / book_ledger list per (user_id, year).
    if (error.code === "23505") {
      const label =
        listType === "library_loan"
          ? "library"
          : listType === "book_ledger"
            ? "book ledger"
            : "list";
      return NextResponse.json(
        { error: `You already have a ${label} list for ${year}.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
