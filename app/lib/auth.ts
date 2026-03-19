import { supabase } from "./supabase";

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, name: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
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

export function getDisplayName(user: { email?: string; user_metadata?: Record<string, string> }) {
  return (
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there"
  );
}
