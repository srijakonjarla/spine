import { SupabaseClient } from "@supabase/supabase-js";
import { localDateStr } from "@/lib/dates";

/**
 * Upserts today's date into reading_log for the authenticated user.
 * Call this whenever a meaningful reading activity occurs (adding a thought,
 * saving a quote, updating book status/dates/rating/feeling/mood tags).
 * Silently no-ops if the row already exists.
 */
export async function autoLogToday(supabase: SupabaseClient, userId: string) {
  const today = localDateStr();
  await supabase
    .from("reading_log")
    .upsert({ user_id: userId, log_date: today }, { onConflict: "user_id,log_date", ignoreDuplicates: true });
}
