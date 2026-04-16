/**
 * Shared application-wide constants.
 * Import from here — never redefine these inline.
 */

/** 3-letter lowercase month slugs used in URL routing (e.g. /2025/jan). */
export const MONTH_ABBRS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** Full month names, index-aligned with MONTH_ABBRS. */
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** All mood tags available for book entries. */
export const MOOD_TAGS = [
  "cozy",
  "dark",
  "hopeful",
  "funny",
  "slow-burn",
  "heart-wrenching",
  "whimsical",
  "thought-provoking",
  "escapist",
] as const;

export type MoodTag = (typeof MOOD_TAGS)[number];
