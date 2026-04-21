import { supabase } from "@/lib/supabase";

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  username: string,
) {
  // Validate username format before hitting the DB
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    throw new Error(
      "username must be 3-30 characters: lowercase letters, numbers, and underscores.",
    );
  }

  // Check username availability via RPC (works without auth session)
  const { data: available, error: rpcError } = await supabase.rpc(
    "is_username_available",
    { p_username: username },
  );
  if (rpcError) throw rpcError;
  if (!available) {
    throw new Error("that username is already taken.");
  }

  // Pass username in metadata so the DB trigger can set it on the profile row.
  // The user isn't authenticated yet (email confirmation pending), so we can't
  // update the profiles table directly from the client.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, custom_name: name, username } },
  });
  if (error) throw error;
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });
  if (error) throw error;
}

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function markGoodreadsImported() {
  await supabase.auth.updateUser({ data: { goodreads_imported: true } });
}

export async function hasImportedGoodreads(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return data.user?.user_metadata?.goodreads_imported === true;
}

export function getDisplayName(user: {
  email?: string;
  user_metadata?: Record<string, string>;
}) {
  return (
    user.user_metadata?.custom_name ||
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there"
  );
}
