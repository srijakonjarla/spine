import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

async function verifyOwner(
  supabase: ReturnType<typeof createServerClient>,
  readId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("book_reads")
    .select("id")
    .eq("id", readId)
    .eq("user_id", userId)
    .single();
  return data;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; readId: string }> },
) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { readId } = await params;
  if (!(await verifyOwner(supabase, readId, user.id)))
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();
  const { data, error } = await supabase
    .from("book_reads")
    .update({
      status: body.status ?? "finished",
      date_started: body.dateStarted || null,
      date_finished: body.dateFinished || null,
      date_shelved: body.dateShelved || null,
      rating: body.rating ?? 0,
      feeling: body.feeling ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", readId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; readId: string }> },
) {
  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { readId } = await params;
  if (!(await verifyOwner(supabase, readId, user.id)))
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await supabase.from("book_reads").delete().eq("id", readId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
