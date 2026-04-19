import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { itemId } = await params;

  // Verify the item's parent list belongs to this user
  const { data: item } = await supabase
    .from("list_items")
    .select("list_id, lists!inner(user_id)")
    .eq("id", itemId)
    .eq("lists.user_id", user.id)
    .single();
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const patch = await req.json();
  const row: Record<string, string> = {};
  if (patch.releaseDate !== undefined) row.item_date = patch.releaseDate;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (Object.keys(row).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase
    .from("list_items")
    .update(row)
    .eq("id", itemId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { itemId } = await params;

  // Verify the item's parent list belongs to this user
  const { data: item } = await supabase
    .from("list_items")
    .select("list_id, lists!inner(user_id)")
    .eq("id", itemId)
    .eq("lists.user_id", user.id)
    .single();
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await supabase.from("list_items").delete().eq("id", itemId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", item.list_id)
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
