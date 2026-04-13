import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upserts today's date into reading_log for the authenticated user.
 * Call this whenever a meaningful reading activity occurs (adding a thought,
 * saving a quote, updating book status/dates/rating/feeling/mood tags).
 * Silently no-ops if the row already exists.
 */
export async function autoLogToday(supabase: SupabaseClient, userId: string) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  await supabase
    .from("reading_log")
    .upsert({ user_id: userId, date: today }, { onConflict: "user_id,date", ignoreDuplicates: true });
}
