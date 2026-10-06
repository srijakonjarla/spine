import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { fetchStaleRows, syncCatalogRows } from "@/lib/catalogSync.server";

// ~10 Hardcover batches per run keeps well inside the function time limit.
const ROWS_PER_RUN = 100;

export const maxDuration = 300;

/** Daily Vercel cron (see vercel.json): refresh the stalest catalog rows. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const rows = await fetchStaleRows(admin, ROWS_PER_RUN);
  const result = await syncCatalogRows(admin, rows);
  return NextResponse.json({ processed: rows.length, ...result });
}
