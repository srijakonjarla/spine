import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient(req);
  const { id: listId } = await params;
  const { catalogId, releaseDate, notes } = await req.json();

  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      catalog_id: catalogId,
      release_date: releaseDate ?? "",
      notes: notes ?? "",
    })
    .select("*, book_catalog(title, author)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("lists").update({ updated_at: new Date().toISOString() }).eq("id", listId);
  return NextResponse.json(data, { status: 201 });
}
