import type { SupabaseClient } from "@supabase/supabase-js";
import { localDateStr } from "../dates";

/**
 * Upserts a reading_log row for today, summing pages_read into any existing
 * row and appending notes. Sets `logged: true` so it counts toward the
 * streak.
 */
export async function logProgress(
  supabase: SupabaseClient,
  opts: { userId: string; pagesRead: number; note?: string },
): Promise<void> {
  const today = localDateStr();

  const { data: existing } = await supabase
    .from("reading_log")
    .select("id, pages_read, note")
    .eq("log_date", today)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("reading_log")
      .update({
        pages_read: (existing.pages_read ?? 0) + opts.pagesRead,
        note: opts.note
          ? `${existing.note ?? ""}\n${opts.note}`.trim()
          : existing.note,
        logged: true,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("reading_log").insert({
      user_id: opts.userId,
      log_date: today,
      pages_read: opts.pagesRead,
      note: opts.note ?? "",
      logged: true,
    });
    if (error) throw error;
  }
}
