import { supabase } from "./supabase";
import type { ReadingLogEntry } from "../types";

interface LogRow {
  id: string;
  log_date: string;
  note: string;
}

function mapLog(row: LogRow): ReadingLogEntry {
  return { id: row.id, logDate: row.log_date, note: row.note };
}

export async function getReadingLog(year: number): Promise<ReadingLogEntry[]> {
  const { data, error } = await supabase
    .from("reading_log")
    .select("*")
    .gte("log_date", `${year}-01-01`)
    .lte("log_date", `${year}-12-31`)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data as LogRow[]).map(mapLog);
}

export async function toggleDay(date: string): Promise<"added" | "removed"> {
  const { data } = await supabase
    .from("reading_log")
    .select("id")
    .eq("log_date", date)
    .maybeSingle();

  if (data) {
    await supabase.from("reading_log").delete().eq("id", data.id);
    return "removed";
  } else {
    await supabase.from("reading_log").insert({ log_date: date });
    return "added";
  }
}
