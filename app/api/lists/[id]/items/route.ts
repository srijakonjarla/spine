import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id: listId } = await params;
  const { catalogId, releaseDate, notes, price, type } = await req.json();

  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      catalog_id: catalogId,
      item_date: releaseDate ?? "",
      notes: notes ?? "",
      price: price ?? "",
      type: type ?? "",
    })
    .select("*, book_catalog(title, author)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("lists").update({ updated_at: new Date().toISOString() }).eq("id", listId);

  // Add to user's want-to-read shelf if not already tracked
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("catalog_id", catalogId)
      .maybeSingle();

    if (!existing) {
      const now = new Date().toISOString();
      await supabase.from("books").insert({
        catalog_id: catalogId,
        user_id: user.id,
        status: "want-to-read",
        date_shelved: now.split("T")[0],
        rating: 0,
        feeling: "",
        bookmarked: false,
        created_at: now,
        updated_at: now,
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}
