import { apiFetch } from "./api";
import { supabase } from "./supabase";

// Account lifecycle helpers — mirrors apps/web/app/lib/auth.ts and the
// web choose-username page, minus the browser-redirect flows.

const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_API_URL?.replace(/\/$/, "") ??
  "https://www.spinereads.com";

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
const USERNAME_RULES =
  "username must be 3-30 characters: lowercase letters, numbers, and underscores.";

async function assertUsernameAvailable(username: string) {
  if (!USERNAME_RE.test(username)) throw new Error(USERNAME_RULES);
  const { data: available, error } = await supabase.rpc(
    "is_username_available",
    { p_username: username },
  );
  if (error) throw error;
  if (!available) throw new Error("that username is already taken.");
}

/**
 * Creates the account. Supabase emails an 8-digit code (and a link);
 * the session starts once `verifySignupOtp` succeeds.
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  username: string,
) {
  const handle = username.trim().toLowerCase();
  await assertUsernameAvailable(handle);
  // Username rides in metadata so the DB trigger can set it on the profile.
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name, custom_name: name, username: handle } },
  });
  if (error) throw error;
}

export async function verifySignupOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token,
    type: "signup",
  });
  if (error) throw error;
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
  });
  if (error) throw error;
}

/** Sends a reset link; the reset itself happens on the web app. */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${WEB_URL}/auth/reset-password`,
  });
  if (error) throw error;
}

/** True when the signed-in user's profile has no username yet. */
export async function needsUsername(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  return !data?.username;
}

export async function claimUsername(username: string) {
  const handle = username.trim().toLowerCase();
  await assertUsernameAvailable(handle);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase
    .from("profiles")
    .update({ username: handle })
    .eq("id", user.id);
  if (error) {
    if (/duplicate|unique/.test(error.message))
      throw new Error("that username is already taken.");
    if (error.message.includes("username_format"))
      throw new Error(USERNAME_RULES);
    throw error;
  }
}

/**
 * Permanently deletes the account and all of its data server-side, then
 * clears the local session (the server one is already gone).
 */
export async function deleteAccount(): Promise<void> {
  await apiFetch("/api/account", { method: "DELETE" });
  await supabase.auth.signOut({ scope: "local" });
}
