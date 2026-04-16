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

  const { id: seriesId } = await params;

  // Verify the series belongs to this user
  const { data: series } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", user.id)
    .single();
  if (!series)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const { orderedIds } = (await req.json()) as { orderedIds: string[] };
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    return NextResponse.json({ error: "orderedIds required" }, { status: 400 });
  }

  // Update position for each book in a single batch
  const updates = orderedIds.map((id, i) =>
    supabase
      .from("series_books")
      .update({ position: i + 1 })
      .eq("id", id)
      .eq("series_id", seriesId),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error)
    return NextResponse.json({ error: failed.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
