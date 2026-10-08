import { NextRequest, NextResponse } from "next/server";
import { createApiClient, createAdminClient } from "@/lib/supabase-server";

// Tables whose user_id FK to auth.users has no ON DELETE CASCADE — deleting
// the auth user fails while any of these rows exist. Child rows
// (series_books) cascade from their parents. Everything else cascades.
const NON_CASCADING = ["goal_books", "recommendations", "series"] as const;

/**
 * DELETE /api/account — permanently deletes the caller's account and all of
 * their data (App Store guideline 5.1.1(v)).
 */
export async function DELETE(req: NextRequest) {
  // Verify the token with Supabase (not just decode it): what follows runs
  // with the service role and bypasses RLS.
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  for (const table of NON_CASCADING) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
