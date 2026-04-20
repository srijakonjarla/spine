import { supabase } from "@/lib/supabase";

// Cache the access token in-memory so we don't call getSession() on every fetch.
// Updated automatically via onAuthStateChange listener.
let cachedToken: string | null = null;

// Store the initial getSession() promise so apiFetch can await it if the
// token hasn't been cached yet (prevents race conditions on first load).
const tokenReady = supabase.auth
  .getSession()
  .then(({ data: { session } }) => {
    cachedToken = session?.access_token ?? null;
  });

supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
});

/**
 * Fetch wrapper that automatically attaches the current user's auth token.
 * Use this in all client-side lib functions instead of calling Supabase directly.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  // If the token hasn't been cached yet, wait for the initial getSession()
  if (cachedToken === null) {
    await tokenReady;
  }
  const token = cachedToken;

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res;
}
