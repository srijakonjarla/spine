import { supabase } from "./supabase";

/**
 * Fetch wrapper that automatically attaches the current user's auth token.
 * Use this in all client-side lib functions instead of calling Supabase directly.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

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
