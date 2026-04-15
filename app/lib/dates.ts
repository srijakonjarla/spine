/**
 * Unified date utilities for Spine.
 *
 * Storage contract
 * ────────────────
 * • date_started / date_finished / date_shelved / log_date  →  PostgreSQL DATE  ("YYYY-MM-DD")
 * • created_at / updated_at                                  →  PostgreSQL TIMESTAMPTZ (UTC)
 *
 * Timezone rule
 * ─────────────
 * DATE-only strings from the database ("2025-01-15") must NEVER be passed
 * directly to `new Date()` — that interprets them as UTC midnight, which
 * shifts the date by up to ±14 hours depending on the user's timezone.
 *
 * Always use:
 *   parseLocalDate("2025-01-15")  →  local-midnight Date in the user's TZ
 *   localDateStr()                →  today as "YYYY-MM-DD" in the user's TZ
 */

// ─── Core primitives ──────────────────────────────────────────────

/**
 * Returns today's date as "YYYY-MM-DD" in the user's local timezone.
 * Pass a Date to get any specific day.
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Safely parse a DATE-only string ("YYYY-MM-DD") as local midnight.
 * Never passes bare date strings to `new Date()` (which would be UTC).
 *
 * Returns null for empty / invalid input.
 */
export function parseLocalDate(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d); // local midnight
}

// ─── Formatting ───────────────────────────────────────────────────

/**
 * Format a DATE string as a human-readable string.
 * Defaults to "Jan 15, 2025". Pass Intl options to customise.
 */
export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = parseLocalDate(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}

/** Format a DATE string as "Jan 15" (no year). */
export function formatShortDate(iso: string): string {
  return formatDate(iso, { month: "short", day: "numeric" });
}

/** Format a DATE string as "January 2025". */
export function formatMonthYear(iso: string): string {
  return formatDate(iso, { month: "long", year: "numeric" });
}

/** Format a DATE string to just the 4-digit year number, or null. */
export function dateYear(iso: string): number | null {
  const d = parseLocalDate(iso);
  return d ? d.getFullYear() : null;
}

/** Format a DATE string to the 0-indexed month number (0 = Jan), or null. */
export function dateMonth(iso: string): number | null {
  const d = parseLocalDate(iso);
  return d !== null ? d.getMonth() : null;
}

/**
 * Format a start–end date range from a read record.
 * E.g. "Jan 2025 – Mar 2025" or "Jan 2025" if start === end.
 */
export function formatReadRange(read: {
  dateStarted: string;
  dateFinished: string;
  dateShelved: string;
}): string {
  const fmt = (iso: string) => formatDate(iso, { month: "short", year: "numeric" });
  const start = read.dateStarted ? fmt(read.dateStarted) : "?";
  const end = read.dateFinished
    ? fmt(read.dateFinished)
    : read.dateShelved
    ? fmt(read.dateShelved)
    : null;
  return end && end !== start ? `${start} – ${end}` : start;
}

// ─── Date math ────────────────────────────────────────────────────

/** Number of calendar days between two DATE strings (always positive). */
export function daysApart(a: string, b: string): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  if (!da || !db) return 0;
  return Math.round(Math.abs(db.getTime() - da.getTime()) / 86400000);
}

/**
 * Add `n` days to a DATE string and return a new "YYYY-MM-DD" string.
 * Uses local timezone arithmetic (no DST-unsafe UTC tricks).
 */
export function addDays(iso: string, n: number): string {
  const d = parseLocalDate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

// ─── Streak helpers ───────────────────────────────────────────────

/**
 * Calculate the current consecutive reading streak ending today (or yesterday).
 *
 * @param loggedDates  Set of "YYYY-MM-DD" strings the user has a reading log for.
 * @returns  Number of consecutive days ending on today (includes today if logged).
 */
export function currentStreak(loggedDates: Set<string>): number {
  let streak = 0;
  const d = new Date(); // local now
  while (loggedDates.has(localDateStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/**
 * Given a set of logged DATE strings, return a new Set containing only
 * the dates that are part of a consecutive streak (have an adjacent neighbour).
 * Used to colour calendar cells differently for streaks vs isolated days.
 */
export function streakDates(loggedDates: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const iso of loggedDates) {
    if (loggedDates.has(addDays(iso, -1)) || loggedDates.has(addDays(iso, 1))) {
      result.add(iso);
    }
  }
  return result;
}

// ─── Reading period ───────────────────────────────────────────────

/**
 * Returns a human-readable reading period string for a book.
 * E.g. "Jan 15 – Mar 4, 2025" or "Currently reading since Jan 15".
 */
export function readingPeriod(entry: {
  dateStarted: string;
  dateFinished: string;
  dateShelved: string;
  status: string;
}): string {
  if (!entry.dateStarted) return "";
  const start = formatShortDate(entry.dateStarted);
  if (entry.dateFinished) {
    const endYear = dateYear(entry.dateFinished);
    const startYear = dateYear(entry.dateStarted);
    const end =
      endYear !== startYear
        ? formatDate(entry.dateFinished)
        : formatShortDate(entry.dateFinished);
    return `${start} – ${end}`;
  }
  if (entry.dateShelved) return `${start} – ${formatShortDate(entry.dateShelved)}`;
  if (entry.status === "reading") return `since ${start}`;
  return start;
}

// ─── Goodreads import helper ──────────────────────────────────────

/**
 * Convert a Goodreads-style date ("YYYY/MM/DD") to "YYYY-MM-DD".
 * Returns empty string for blank input.
 */
export function goodreadsDateToISO(d: string): string {
  if (!d) return "";
  return d.replace(/\//g, "-");
}
