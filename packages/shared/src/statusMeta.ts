import type { ReadingStatus } from "./types";

/**
 * Canonical reading-status vocabulary shared across web and mobile: the
 * ordering, the long-form labels, and the glyphs.
 *
 * Note: each app may layer its own *presentation* on top — e.g. mobile's
 * list pills use shorter labels ("tbr", "dnf"). Tailwind color classes stay
 * web-only. This module holds only the platform-neutral canonical values.
 */

export const STATUS_LABEL: Record<string, string> = {
  reading: "currently reading",
  finished: "read",
  "want-to-read": "want to read",
  "did-not-finish": "did not finish",
};

export const STATUS_SYMBOL: Record<string, string> = {
  reading: "○",
  finished: "●",
  "want-to-read": "○",
  "did-not-finish": "×",
};

/** Status pills (value + short label) used by hero and filter UIs. */
export const STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: "reading", label: "reading" },
  { value: "finished", label: "read" },
  { value: "did-not-finish", label: "did not finish" },
  { value: "want-to-read", label: "want to read" },
];

export const STATUS_ORDER = [
  "reading",
  "want-to-read",
  "finished",
  "did-not-finish",
] as const;

/** Statuses that get truncated on the shelf overview. */
export const TRUNCATED_STATUSES = new Set(["want-to-read", "finished"]);
export const TRUNCATE_LIMIT = 10;
