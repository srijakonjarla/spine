import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req);
  const { orderedIds } = await req.json();

  const { error } = await supabase.rpc("reorder_lists", {
    ids: orderedIds,
    orders: orderedIds.map((_: string, i: number) => i),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
