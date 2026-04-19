import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

function makeClient(token: string | null | undefined) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {},
  );
}

/**
 * Creates a Supabase client authenticated as the requesting user.
 * Reads the JWT from the Authorization header so RLS policies apply normally.
 */
export function createServerClient(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  return makeClient(token);
}

/**
 * Creates a Supabase client for use inside Server Actions.
 * The caller passes the JWT obtained on the client via supabase.auth.getSession().
 */
export function createActionClient(token: string | null | undefined) {
  return makeClient(token);
}

/**
 * Creates a Supabase client authenticated with the service role key.
 * Bypasses RLS — callers MUST scope every query by `user_id` themselves.
 * Use only for background/long-running jobs where the session JWT would expire
 * mid-run (e.g. admin backfill, bulk imports triggered via `after()`).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
