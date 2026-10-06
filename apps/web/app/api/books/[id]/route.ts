import { NextRequest, NextResponse } from "next/server";
import { createApiClient, getUserId } from "@/lib/supabase-server";
import { autoLogToday } from "@/lib/autoLog";
import {
  CATALOG_COLUMNS,
  USER_BOOK_COLUMNS,
  flattenUserBook,
  userBookPatchFromEntry,
} from "@/lib/bookUpsert.server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId) return NextResponse.json(null, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("user_books")
    .select(
      `${USER_BOOK_COLUMNS}, catalog_books(${CATALOG_COLUMNS}), thoughts(*), book_reads(*)`,
    )
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(
    flattenUserBook(data as unknown as Parameters<typeof flattenUserBook>[0]),
  );
}

const READING_ACTIVITY_FIELDS = new Set([
  "status",
  "dateStarted",
  "dateFinished",
  "rating",
  "feeling",
  "moodTags",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const patch = await req.json();

  const { data: updated, error } = await supabase
    .from("user_books")
    .update({
      ...userBookPatchFromEntry(patch),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const isReadingActivity = Object.keys(patch).some((k) =>
    READING_ACTIVITY_FIELDS.has(k),
  );
  if (isReadingActivity) await autoLogToday(supabase, userId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  // Deleting user_books cascades to thoughts, book_reads via FK
  const { error } = await supabase
    .from("user_books")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
