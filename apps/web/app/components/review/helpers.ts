// ─── Helpers ──────────────────────────────────────────────────────

import { BookEntry } from "@/types";

export function countBy<T>(
  items: T[],
  key: (item: T) => string,
): [string, number][] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function countTags<T>(
  items: T[],
  key: (item: T) => string[],
): [string, number][] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const tag of key(item)) {
      if (tag) counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function fmtPages(n: number): string {
  return n.toLocaleString();
}

export function uniqueById(books: BookEntry[]) {
  return books.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
}
