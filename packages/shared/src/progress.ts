import { localDateStr } from "./dates";
import type { BookEntry } from "./types";

// Reading progress lives on thoughts: a thought with a pageNumber records
// "up to page N" in that book (web quick log / mobile log progress).

/** Furthest page recorded in the book's thoughts, or 0. */
export function latestPage(book: Pick<BookEntry, "thoughts">): number {
  let latest: { page: number; at: string } | null = null;
  for (const t of book.thoughts) {
    if (t.pageNumber == null) continue;
    if (!latest || t.createdAt > latest.at)
      latest = { page: t.pageNumber, at: t.createdAt };
  }
  return latest?.page ?? 0;
}

/**
 * Pages advanced on `date` across all books: for each book, the last page
 * logged that day minus the last page logged before it (never negative).
 */
export function pagesReadOn(books: BookEntry[], date: string): number {
  let total = 0;
  for (const b of books) {
    const paged = b.thoughts
      .filter((t) => t.pageNumber != null)
      .sort((x, y) => x.createdAt.localeCompare(y.createdAt));
    let before = 0;
    let endOfDay: number | null = null;
    for (const t of paged) {
      const day = localDateStr(new Date(t.createdAt));
      if (day < date) before = t.pageNumber!;
      else if (day === date) endOfDay = t.pageNumber!;
    }
    if (endOfDay != null) total += Math.max(0, endOfDay - before);
  }
  return total;
}
