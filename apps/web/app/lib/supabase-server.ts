import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

/**
 * Creates a Supabase client for API route handlers.
 * Reads the JWT from the Authorization header so RLS policies apply normally.
 */
export function createApiClient(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {},
  );
}

/**
 * Extracts the user ID from the JWT without making a network call.
 * The token is already verified by RLS on every Supabase query, so we
 * only need to decode it (not verify) to get the sub claim for filtering.
 *
 * Returns null if no valid token is present.
 */
export function getUserId(req: NextRequest): string | null {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Creates a Supabase client for Server Actions.
 * Reads auth from cookies — no token argument needed, nothing logged by Next.js.
 */
export async function createActionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies; safe to ignore in read-only contexts
          }
        },
      },
    },
  );
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
