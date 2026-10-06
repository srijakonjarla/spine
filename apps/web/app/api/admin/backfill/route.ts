import { NextRequest, NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAdminClient,
  createApiClient,
  getUserId,
} from "@/lib/supabase-server";
import {
  SYNC_COLUMNS,
  type SyncRow,
  syncCatalogRows,
} from "@/lib/catalogSync.server";

/**
 * "Enrich library": sync every catalog row in the user's library that has
 * never been synced with Hardcover (links it to a Hardcover id and fills
 * metadata). Ongoing freshness is handled by the catalog-sync cron.
 */
async function fetchUnsyncedRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncRow[]> {
  const { data, error } = await supabase
    .from("user_books")
    .select(`catalog_books!inner(${SYNC_COLUMNS})`)
    .eq("user_id", userId)
    .is("catalog_books.synced_at", null);
  if (error) {
    console.error("[backfill] query error:", error.message);
    return [];
  }
  const seen = new Set<string>();
  return (data ?? [])
    .map((ub) => ub.catalog_books as unknown as SyncRow)
    .filter((cb) => cb?.id && !seen.has(cb.id) && seen.add(cb.id));
}

async function setRunning(
  admin: SupabaseClient,
  userId: string,
  running: boolean,
) {
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
  meta.backfill_running = running;
  await admin.auth.admin.updateUserById(userId, { user_metadata: meta });
}

export async function GET(req: NextRequest) {
  const supabase = createApiClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const running = user.user_metadata?.backfill_running === true;
  const remaining = (await fetchUnsyncedRows(supabase, user.id)).length;
  return NextResponse.json({ remaining, running });
}

export async function POST(req: NextRequest) {
  const supabase = createApiClient(req);
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await fetchUnsyncedRows(supabase, userId);
  console.log(
    `[backfill] POST started for user ${userId}, ${rows.length} rows`,
  );

  // Service-role client: the user's JWT would expire mid-run on large
  // libraries, and catalog_books is not writable with a user JWT.
  const admin = createAdminClient();
  await setRunning(admin, userId, true);

  after(async () => {
    try {
      await syncCatalogRows(admin, rows);
    } finally {
      await setRunning(admin, userId, false);
    }
  });

  return NextResponse.json({ started: true, total: rows.length });
}
