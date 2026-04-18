import { BookEntry } from "@/types";
import { localDateStr, daysApart } from "./dates";

export type TabId =
  | "reflection"
  | "quotes"
  | "timeline"
  | "details"
  | `read-${string}`;

/** Average pages read per day given a book entry's page count and date range. */
export function avgPagesPerDay(entry: BookEntry): number | null {
  if (!entry.pageCount || !entry.dateStarted) return null;
  const end = entry.dateFinished || localDateStr();
  const days = daysApart(entry.dateStarted, end) + 1 || 1;
  return Math.round(entry.pageCount / days);
}
