import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: listId } = await params;
  const { orderedIds } = await req.json();

  // Verify the list belongs to this user
  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .single();
  if (!list) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await supabase.rpc("reorder_list_items", {
    ids: orderedIds,
    orders: orderedIds.map((_: string, i: number) => i),
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
