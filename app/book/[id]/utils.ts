import type { BookEntry } from "@/types";
import { daysApart, localDateStr } from "@/lib/dates";

/** Deterministic 0-9 index derived from the book title, used to pick a hero gradient CSS class. */
export function heroGradientIndex(title: string): number {
  let h = 0;
  const s = title || " ";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 10;
}

/** Average pages read per day given a book entry's page count and date range. */
export function avgPagesPerDay(entry: BookEntry): number | null {
  if (!entry.pageCount || !entry.dateStarted) return null;
  const end = entry.dateFinished || localDateStr();
  const days = daysApart(entry.dateStarted, end) + 1 || 1;
  return Math.round(entry.pageCount / days);
}

/** Returns a time-of-day emoji for a given ISO timestamp. */
export function timeOfDayEmoji(iso: string): string {
  const h = new Date(iso).getHours();
  if (h >= 5  && h < 12) return "☀️";
  if (h >= 12 && h < 17) return "🌤️";
  if (h >= 17 && h < 21) return "🌆";
  return "🌙";
}
