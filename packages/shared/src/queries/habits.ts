import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadingLogEntry } from "../types";

interface LogRow {
  id: string;
  user_id: string;
  log_date: string;
  note: string | null;
  pages_read: number | null;
  logged: boolean;
}

function mapRow(row: LogRow): ReadingLogEntry {
  return {
    id: row.id,
    logDate: row.log_date,
    note: row.note ?? "",
    logged: row.logged,
    pagesRead: row.pages_read ?? 0,
  };
}

/**
 * Lists all reading_log rows for a given year. RLS scopes to the current user.
 */
export async function loadReadingLog(
  supabase: SupabaseClient,
  year: number,
): Promise<ReadingLogEntry[]> {
  const { data, error } = await supabase
    .from("reading_log")
    .select("id, user_id, log_date, note, pages_read, logged")
    .gte("log_date", `${year}-01-01`)
    .lte("log_date", `${year}-12-31`)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as LogRow[]).map(mapRow);
}

/**
 * Toggles a reading_log entry for a given date. If a row exists and is
 * logged, unlog it (keep the row if it has a note). If it exists but isn't
 * logged, mark it logged. If no row exists, insert one.
 */
export async function toggleLogEntry(
  supabase: SupabaseClient,
  opts: { userId: string; date: string },
): Promise<"added" | "removed"> {
  const { data: existing } = await supabase
    .from("reading_log")
    .select("id, logged")
    .eq("log_date", opts.date)
    .maybeSingle();

  if (existing && existing.logged) {
    const { error } = await supabase
      .from("reading_log")
      .update({ logged: false })
      .eq("id", existing.id);
    if (error) throw error;
    return "removed";
  } else if (existing) {
    const { error } = await supabase
      .from("reading_log")
      .update({ logged: true })
      .eq("id", existing.id);
    if (error) throw error;
    return "added";
  } else {
    const { error } = await supabase
      .from("reading_log")
      .insert({ user_id: opts.userId, log_date: opts.date, logged: true });
    if (error) throw error;
    return "added";
  }
}

/**
 * Upserts a note onto the reading_log row for a date. Note-only entries
 * default to `logged: false` so they don't count as reading days.
 */
export async function setLogNote(
  supabase: SupabaseClient,
  opts: { userId: string; date: string; note: string },
): Promise<void> {
  const { data: existing } = await supabase
    .from("reading_log")
    .select("id")
    .eq("log_date", opts.date)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("reading_log")
        .update({ note: opts.note })
        .eq("id", existing.id)
    : await supabase.from("reading_log").insert({
        user_id: opts.userId,
        log_date: opts.date,
        note: opts.note,
        logged: false,
      });

  if (error) throw error;
}
