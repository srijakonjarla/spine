import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Creates a Supabase client authenticated as the requesting user.
 * Reads the JWT from the Authorization header so RLS policies apply normally.
 */
export function createServerClient(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {},
  );
}
