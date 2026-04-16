import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orderedIds } = await req.json();

  // Verify all lists belong to this user
  const { data: owned } = await supabase
    .from("lists")
    .select("id")
    .in("id", orderedIds)
    .eq("user_id", user.id);
  if (!owned || owned.length !== orderedIds.length) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await supabase.rpc("reorder_lists", {
    ids: orderedIds,
    orders: orderedIds.map((_: string, i: number) => i),
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
