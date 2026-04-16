import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: listId } = await params;
  const { title, author, releaseDate, notes, price, type } = await req.json();

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
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId);

  return NextResponse.json(data, { status: 201 });
}
