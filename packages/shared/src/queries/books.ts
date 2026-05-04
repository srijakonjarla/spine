import type { SupabaseClient } from "@supabase/supabase-js";
import { localDateStr } from "../dates";

/**
 * Marks a `user_books` row as finished as of today. The row's `status`
 * becomes `finished` and `date_finished` is set to today's local date.
 */
export async function markBookFinished(
  supabase: SupabaseClient,
  userBookId: string,
): Promise<void> {
  const today = localDateStr();
  const { error } = await supabase
    .from("user_books")
    .update({ status: "finished", date_finished: today })
    .eq("id", userBookId);
  if (error) throw error;
}
