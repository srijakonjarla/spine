import type { BookEntry } from "./types";

/**
 * Deterministic integer hash of a string. Always returns a non-negative number.
 * Used for stable color/height assignments from titles.
 */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Every read finished in `year`, one entry per read, sorted by finish date.
 *
 * book_reads holds archived previous reads (a new row is only created when
 * the user starts another re-read). The current/active read lives on the
 * entry itself, so both sources are counted.
 */
export function finishedInYear(
  entries: BookEntry[],
  year: number,
): BookEntry[] {
  const prefix = `${year}`;
  const result: BookEntry[] = [];
  for (const b of entries) {
    b.reads
      .filter((r) => r.dateFinished?.startsWith(prefix))
      .forEach((r) => result.push({ ...b, dateFinished: r.dateFinished }));
    if (b.status === "finished" && b.dateFinished?.startsWith(prefix)) {
      result.push(b);
    }
  }
  return result.sort((a, b) =>
    (a.dateFinished ?? "").localeCompare(b.dateFinished ?? ""),
  );
}

/** Average of non-zero ratings, to one decimal, or null when nothing is rated. */
export function averageRating(books: BookEntry[]): string | null {
  const rated = books.filter((b) => b.rating > 0);
  if (!rated.length) return null;
  return (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1);
}

// ─── Year-in-review aggregation ──────────────────────────────────

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

export function uniqueById(books: BookEntry[]): BookEntry[] {
  return books.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
}
