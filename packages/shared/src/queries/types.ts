/**
 * Types returned by the shared query functions. These are *flattened* shapes
 * — joins from catalog_books / goal_books are pre-merged so callers don't
 * have to handle nullable nested objects.
 */

import type { ReadingLogEntry } from "../types";

export interface HomeReading {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  moodTags: string[];
  dateStarted: string;
  pageCount: number | null;
}

export interface HomeFinished {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  rating: number;
  dateFinished: string;
}

export interface HomeGoal {
  id: string;
  year: number;
  target: number;
  name: string;
  isAuto: boolean;
  /** number of books that count toward this goal so far */
  current: number;
  pinnedBookIds: string[];
}

/** Re-exported so callers can import it from `@spine/shared/queries`. */
export type HomeLogEntry = ReadingLogEntry;

export interface HomeData {
  reading: HomeReading[];
  recentlyFinished: HomeFinished[];
  finishedThisYear: number;
  wantToReadCount: number;
  log: ReadingLogEntry[];
  goal: HomeGoal | null;
  pagesToday: number;
}

export interface GoalListItem {
  id: string;
  year: number;
  target: number;
  name: string;
  isAuto: boolean;
  pinnedBookIds: string[];
  /** count of pinned books currently finished (for custom goals) */
  pinnedFinished: number;
  /** count of all books finished in the goal's year (for auto goals) */
  yearFinished: number;
}
