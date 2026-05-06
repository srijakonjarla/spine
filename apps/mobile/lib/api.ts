import { supabase } from "./supabase";

const WEB_API_URL =
  process.env.EXPO_PUBLIC_WEB_API_URL?.replace(/\/$/, "") ??
  "https://www.spinereads.com";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  console.log(
    `[apiFetch] ${init.method ?? "GET"} ${WEB_API_URL}${path} hasToken=${!!token} tokenLen=${token?.length ?? 0}`,
  );

  const res = await fetch(`${WEB_API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(
      res.status,
      `API ${res.status} ${path}: ${text}${!token ? " (no token sent — session missing)" : ""}`,
    );
  }
  return res;
}

/** No-auth variant for public endpoints like `/api/catalog`. */
export async function publicFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${WEB_API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, `API ${res.status} ${path}: ${text}`);
  }
  return res;
}
