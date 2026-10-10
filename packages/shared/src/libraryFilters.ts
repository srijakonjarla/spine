import type { BookEntry } from "./types";
import { dateYear } from "./dates";

/**
 * Whole-star rating bucket; 0 means unrated. Half stars round down
 * (3.5★ is in bucket 3), except 0.5★, which counts as 1★.
 */
export type RatingBucket = 0 | 1 | 2 | 3 | 4 | 5;

export interface LibraryFilterState {
  search: string;
  mood: string | null;
  /** Multi-value filters match books with any of the selected values. */
  genres: string[];
  /** Selected rating buckets; empty means any rating. */
  ratings: RatingBucket[];
  formats: string[];
  /** Year the book was finished */
  years: number[];
  bookshelves: string[];
}

export const EMPTY_LIBRARY_FILTERS: LibraryFilterState = {
  search: "",
  mood: null,
  genres: [],
  ratings: [],
  formats: [],
  years: [],
  bookshelves: [],
};

/** Rating buckets in display order: 5★ down to 1★, then unrated. */
export const RATING_BUCKETS: RatingBucket[] = [5, 4, 3, 2, 1, 0];

export function ratingBucket(rating: number): RatingBucket {
  if (!rating || rating <= 0) return 0;
  return Math.max(1, Math.min(5, Math.floor(rating))) as RatingBucket;
}

export type LibrarySort =
  | "date-desc"
  | "date-asc"
  | "read-desc"
  | "read-asc"
  | "shelved-desc"
  | "shelved-asc"
  | "title"
  | "author"
  | "rating-desc"
  | "rating-asc";

export const LIBRARY_SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: "date-desc", label: "most recent" },
  { value: "date-asc", label: "oldest" },
  { value: "read-desc", label: "recently read" },
  { value: "read-asc", label: "first read" },
  { value: "shelved-desc", label: "recently shelved" },
  { value: "shelved-asc", label: "first shelved" },
  { value: "title", label: "title a–z" },
  { value: "author", label: "author a–z" },
  { value: "rating-desc", label: "highest rated" },
  { value: "rating-asc", label: "lowest rated" },
];

/** Sorts whose order follows the finish date, so year shelves still make sense. */
export function isDateSort(sort: LibrarySort): boolean {
  return (
    sort === "date-desc" ||
    sort === "date-asc" ||
    sort === "read-desc" ||
    sort === "read-asc"
  );
}

/** Canonical form for mood tags so "Slow Burn" and "slow-burn" match. */
export function normalizeMood(mood: string): string {
  return mood.trim().toLowerCase().replace(/\s+/g, "-");
}

export interface LibraryFilterOptions {
  moods: string[];
  genres: string[];
  formats: string[];
  /** Finish years, most recent first */
  years: number[];
  bookshelves: string[];
  /** Number of books in each rating bucket */
  ratingCounts: Record<RatingBucket, number>;
}

/** Distinct filter values present in the given books. */
export function libraryFilterOptions(books: BookEntry[]): LibraryFilterOptions {
  const moods = new Set<string>();
  const genres = new Set<string>();
  const formats = new Set<string>();
  const years = new Set<number>();
  const bookshelves = new Set<string>();
  const ratingCounts: Record<RatingBucket, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const b of books) {
    ratingCounts[ratingBucket(b.rating)]++;
    (b.moodTags ?? []).forEach((m) => {
      const n = normalizeMood(m);
      if (n) moods.add(n);
    });
    (b.genres ?? []).forEach((g) => g && genres.add(g));
    if (b.format) formats.add(b.format);
    const y = b.dateFinished ? dateYear(b.dateFinished) : null;
    if (y != null) years.add(y);
    (b.bookshelves ?? []).forEach((s) => s && bookshelves.add(s));
  }
  const alpha = (a: string, b: string) => a.localeCompare(b);
  return {
    moods: [...moods].sort(alpha),
    genres: [...genres].sort(alpha),
    formats: [...formats].sort(alpha),
    years: [...years].sort((a, b) => b - a),
    bookshelves: [...bookshelves].sort(alpha),
    ratingCounts,
  };
}

export function matchesLibraryFilters(
  b: BookEntry,
  f: LibraryFilterState,
): boolean {
  const q = f.search.trim().toLowerCase();
  if (
    q &&
    !(b.title ?? "").toLowerCase().includes(q) &&
    !(b.author ?? "").toLowerCase().includes(q)
  )
    return false;
  if (f.mood && !(b.moodTags ?? []).some((m) => normalizeMood(m) === f.mood))
    return false;
  if (
    f.genres.length > 0 &&
    !(b.genres ?? []).some((g) => f.genres.includes(g))
  )
    return false;
  if (f.ratings.length > 0 && !f.ratings.includes(ratingBucket(b.rating)))
    return false;
  if (f.formats.length > 0 && !f.formats.includes(b.format)) return false;
  if (f.years.length > 0) {
    const y = dateYear(b.dateFinished ?? "");
    if (y == null || !f.years.includes(y)) return false;
  }
  if (
    f.bookshelves.length > 0 &&
    !(b.bookshelves ?? []).some((s) => f.bookshelves.includes(s))
  )
    return false;
  return true;
}

/** Number of active filters, excluding search and mood (which have their own UI). */
export function activeFilterCount(f: LibraryFilterState): number {
  return [f.ratings, f.genres, f.formats, f.years, f.bookshelves].filter(
    (v) => v.length > 0,
  ).length;
}

/** Clears the dropdown filters, keeping search and mood. */
export function clearDropdownFilters(
  f: LibraryFilterState,
): LibraryFilterState {
  return {
    ...f,
    ratings: [],
    genres: [],
    formats: [],
    years: [],
    bookshelves: [],
  };
}

export function hasActiveFilters(f: LibraryFilterState): boolean {
  return !!f.search.trim() || !!f.mood || activeFilterCount(f) > 0;
}

/** The date that matters for a book's current shelf. */
export function shelfDate(b: BookEntry): string {
  switch (b.status) {
    case "reading":
      return b.dateStarted || b.createdAt;
    case "finished":
      return b.dateFinished || b.updatedAt;
    case "did-not-finish":
      return b.dateDnfed || b.updatedAt;
    default:
      return b.dateShelved || b.createdAt;
  }
}

/** Returns a new, sorted array. Ties fall back to title. */
export function sortBooks(books: BookEntry[], sort: LibrarySort): BookEntry[] {
  const byTitle = (a: BookEntry, b: BookEntry) =>
    (a.title ?? "").localeCompare(b.title ?? "");
  // Compares an optional date; books missing it go last in either direction.
  const byDate = (x: string, y: string, dir: 1 | -1) =>
    !x || !y ? Number(!x) - Number(!y) : dir * x.localeCompare(y);
  const cmp = (a: BookEntry, b: BookEntry): number => {
    switch (sort) {
      case "date-desc":
        return (shelfDate(b) ?? "").localeCompare(shelfDate(a) ?? "");
      case "date-asc":
        return (shelfDate(a) ?? "").localeCompare(shelfDate(b) ?? "");
      case "read-desc":
        return byDate(a.dateFinished, b.dateFinished, -1);
      case "read-asc":
        return byDate(a.dateFinished, b.dateFinished, 1);
      case "shelved-desc":
        return byDate(a.dateShelved, b.dateShelved, -1);
      case "shelved-asc":
        return byDate(a.dateShelved, b.dateShelved, 1);
      case "title":
        return 0;
      case "author":
        return (a.author ?? "").localeCompare(b.author ?? "");
      case "rating-desc":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "rating-asc":
        // Unrated books go last rather than first.
        return (a.rating || Infinity) - (b.rating || Infinity);
    }
  };
  return [...books].sort((a, b) => cmp(a, b) || byTitle(a, b));
}

export type FinishedShelf =
  | { kind: "year"; year: number; books: BookEntry[] }
  | { kind: "earlier"; books: BookEntry[] }
  | { kind: "all"; books: BookEntry[] };

/**
 * Groups finished books into year shelves for date sorts. Any other sort
 * flattens them into a single "all" shelf so the order reads top to bottom.
 * Books without a finish date land on a trailing "earlier" shelf.
 */
export function shelveFinished(
  books: BookEntry[],
  sort: LibrarySort,
): FinishedShelf[] {
  if (books.length === 0) return [];
  if (!isDateSort(sort))
    return [{ kind: "all", books: sortBooks(books, sort) }];

  const yearMap = new Map<number, BookEntry[]>();
  const earlier: BookEntry[] = [];
  for (const b of books) {
    const y = b.dateFinished ? dateYear(b.dateFinished) : null;
    if (y == null) {
      earlier.push(b);
      continue;
    }
    if (!yearMap.has(y)) yearMap.set(y, []);
    yearMap.get(y)!.push(b);
  }
  const dir = sort.endsWith("-desc") ? -1 : 1;
  const shelves: FinishedShelf[] = [...yearMap.entries()]
    .sort((a, b) => dir * (a[0] - b[0]))
    .map(([year, ys]) => ({ kind: "year", year, books: sortBooks(ys, sort) }));
  if (earlier.length > 0) {
    shelves.push({ kind: "earlier", books: sortBooks(earlier, "title") });
  }
  return shelves;
}
