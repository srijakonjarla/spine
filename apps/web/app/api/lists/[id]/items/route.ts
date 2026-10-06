import { NextRequest, NextResponse } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: listId } = await params;
  const { title, author, releaseDate, notes, price, type, bookId } =
    await req.json();

  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      title: title ?? "",
      author: author ?? "",
      item_date: releaseDate ?? "",
      notes: notes ?? "",
      price: price ?? "",
      type: type ?? "",
      book_id: bookId ?? null,
    })
    .select(
      "*, user_books(title_override, cover_url_override, catalog_books(title, cover_url))",
    )
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId);

  if (bookId) {
    const { data: existing } = await supabase
      .from("user_books")
      .select("status, date_shelved")
      .eq("id", bookId)
      .eq("user_id", userId)
      .maybeSingle();

    const shelvedStatuses = ["reading", "finished", "did-not-finish"];
    if (existing && !shelvedStatuses.includes(existing.status)) {
      await supabase
        .from("user_books")
        .update({
          status: "want-to-read",
          date_shelved:
            existing.date_shelved ?? new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookId)
        .eq("user_id", userId);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
