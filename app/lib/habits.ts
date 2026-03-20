import { apiFetch } from "@/lib/api";
import type { ReadingLogEntry } from "@/types";

export async function getReadingLog(year: number): Promise<ReadingLogEntry[]> {
  const res = await apiFetch(`/api/habits?year=${year}`);
  const data: { id: string; log_date: string; note: string }[] = await res.json();
  return data.map((row) => ({ id: row.id, logDate: row.log_date, note: row.note }));
}

export async function toggleDay(date: string): Promise<"added" | "removed"> {
  const res = await apiFetch("/api/habits", {
    method: "POST",
    body: JSON.stringify({ date }),
  });
  const { result } = await res.json();
  return result;
}
