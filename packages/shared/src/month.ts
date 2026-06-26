/**
 * Pure derivation helpers for the monthly spread (web `[year]/[month]` and
 * mobile calendar tab). All logic that can be shared across UI shells lives
 * here; the consumers only own rendering.
 */

import { localDateStr } from "./dates";
import type { BookEntry, BookRead, Quote, ReadingLogEntry } from "./types";

// ─── Month math ────────────────────────────────────────────────────

/** "YYYY-MM" key for the given local year + 0-indexed month. */
export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** Result of stepping ± months across year boundaries. */
export function stepMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const m = monthIndex + delta;
  if (m < 0) return { year: year - 1, monthIndex: 11 };
  if (m > 11) return { year: year + 1, monthIndex: 0 };
  return { year, monthIndex: m };
}

// ─── Calendar grid ─────────────────────────────────────────────────

export type MonthCell = { day: number | null; dateStr: string };

/**
 * Returns a 7-column grid of cells covering the full month. Leading cells
 * for empty weekdays before day 1 have `day: null` / `dateStr: ""`.
 */
export function buildMonthCells(year: number, monthIndex: number): MonthCell[] {
  const key = monthKey(year, monthIndex);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const out: MonthCell[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    out.push({ day: null, dateStr: "" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    out.push({ day: d, dateStr: `${key}-${String(d).padStart(2, "0")}` });
  }
  return out;
}

// ─── Spread derivation ─────────────────────────────────────────────

export interface MonthSpread {
  /** "YYYY-MM" key for the visible month. */
  monthKey: string;
  /** Logged dates within this month (filtered subset of `loggedDates`). */
  loggedDatesThisMonth: Set<string>;
  /** Dates a book was finished or DNF'd this month. */
  finishedDatesThisMonth: Set<string>;
  /** dateStr → the book that was finished/DNF'd on that date (last wins). */
  finishedByDate: Map<string, BookEntry>;
  /** Dates a quote was saved this month. */
  quoteDatesThisMonth: Set<string>;
  /** Dates with a log note in this month. */
  noteDatesThisMonth: Set<string>;
  /** All books currently being read (across the whole library). */
  reading: BookEntry[];
  /** want-to-read books with `upNext` flag set (across the whole library). */
  upNext: BookEntry[];
  /** Books finished or DNF'd in this month. */
  finishedThisMonth: BookEntry[];
  /** Quotes saved in this month. */
  quotesThisMonth: Quote[];
  /** Number of distinct logged days this month. */
  daysRead: number;
}

export function computeMonthSpread(opts: {
  books: BookEntry[];
  quotes: Quote[];
  logEntries: ReadingLogEntry[];
  year: number;
  monthIndex: number;
}): MonthSpread {
  const { books, quotes, logEntries, year, monthIndex } = opts;
  const key = monthKey(year, monthIndex);

  const loggedDatesThisMonth = new Set<string>();
  const noteDatesThisMonth = new Set<string>();
  for (const e of logEntries) {
    if (!e.logDate.startsWith(key)) continue;
    if (e.logged) loggedDatesThisMonth.add(e.logDate);
    if (e.note?.trim()) noteDatesThisMonth.add(e.logDate);
  }

  const finishedByDate = new Map<string, BookEntry>();
  const finishedThisMonth: BookEntry[] = [];
  const reading: BookEntry[] = [];
  const upNext: BookEntry[] = [];
  for (const b of books) {
    if (b.status === "reading") reading.push(b);
    if (b.status === "want-to-read" && b.upNext) upNext.push(b);
    if (b.status === "finished" && b.dateFinished?.startsWith(key)) {
      finishedByDate.set(b.dateFinished, b);
      finishedThisMonth.push(b);
    } else if (b.status === "did-not-finish" && b.dateDnfed?.startsWith(key)) {
      finishedByDate.set(b.dateDnfed, b);
      finishedThisMonth.push(b);
    }
  }

  const quoteDatesThisMonth = new Set<string>();
  const quotesThisMonth: Quote[] = [];
  for (const q of quotes) {
    if (q.createdAt.startsWith(key)) quotesThisMonth.push(q);
    const localDay = localDateStr(new Date(q.createdAt));
    if (localDay.startsWith(key)) quoteDatesThisMonth.add(localDay);
  }

  return {
    monthKey: key,
    loggedDatesThisMonth,
    finishedDatesThisMonth: new Set(finishedByDate.keys()),
    finishedByDate,
    quoteDatesThisMonth,
    noteDatesThisMonth,
    reading,
    upNext,
    finishedThisMonth,
    quotesThisMonth,
    daysRead: loggedDatesThisMonth.size,
  };
}

// ─── Day panel derivation ──────────────────────────────────────────

/** Reference to a per-book read whose date falls on the selected day. */
export interface DayBookLogEntry {
  bookTitle: string;
  bookId: string;
  read: BookRead;
}

/** Reference to a thought authored on the selected day. */
export interface DayThoughtEntry {
  id: string;
  text: string;
  bookTitle: string;
  bookId: string;
}

export interface DayPanelData {
  /** The reading_log row for this date, if any. */
  log: ReadingLogEntry | undefined;
  /** Whether `loggedDates` contains this date. */
  isLogged: boolean;
  /** Books whose `dateStarted` matches this date (and weren't finished same day). */
  started: BookEntry[];
  /** Books finished or DNF'd on this date. */
  finished: BookEntry[];
  /** Quotes saved on this date (matched by local-tz day of `createdAt`). */
  quotes: Quote[];
  /** Per-book reads on this date for books NOT already in `started`/`finished`. */
  bookLog: DayBookLogEntry[];
  /** Thoughts authored on this date (matched by local-tz day of `createdAt`). */
  thoughts: DayThoughtEntry[];
}

export function computeDayPanelData(opts: {
  books: BookEntry[];
  quotes: Quote[];
  logEntries: ReadingLogEntry[];
  loggedDates: Set<string>;
  date: string;
}): DayPanelData {
  const { books, quotes, logEntries, loggedDates, date } = opts;
  const log = logEntries.find((e) => e.logDate === date);
  const finished = books.filter(
    (b) =>
      (b.status === "finished" || b.status === "did-not-finish") &&
      (b.dateFinished === date || b.dateDnfed === date),
  );
  const started = books.filter(
    (b) =>
      b.status !== "want-to-read" &&
      b.dateStarted === date &&
      b.dateFinished !== date &&
      b.dateDnfed !== date,
  );
  const dayQuotes = quotes.filter(
    (q) => localDateStr(new Date(q.createdAt)) === date,
  );

  const startedIds = new Set(started.map((b) => b.id));
  const finishedIds = new Set(finished.map((b) => b.id));
  const bookLog: DayBookLogEntry[] = books.flatMap((b) => {
    if (startedIds.has(b.id) || finishedIds.has(b.id)) return [];
    return b.reads
      .filter((r) => {
        const readDate =
          r.status === "finished"
            ? r.dateFinished
            : r.status === "did-not-finish"
              ? r.dateDnfed
              : r.dateStarted;
        return readDate === date;
      })
      .map((r) => ({ bookTitle: b.title, bookId: b.id, read: r }));
  });

  const thoughts: DayThoughtEntry[] = books.flatMap((b) =>
    b.thoughts
      .filter((t) => localDateStr(new Date(t.createdAt)) === date)
      .map((t) => ({
        id: t.id,
        text: t.text,
        bookTitle: b.title,
        bookId: b.id,
      })),
  );

  return {
    log,
    isLogged: loggedDates.has(date),
    started,
    finished,
    quotes: dayQuotes,
    bookLog,
    thoughts,
  };
}
