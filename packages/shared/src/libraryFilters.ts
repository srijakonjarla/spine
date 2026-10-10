import type { BookEntry } from "./types";
import { dateYear } from "./dates";

export type RatingFilter = "5" | "4+" | "3+" | "unrated";

export interface LibraryFilterState {
  search: string;
  mood: string | null;
  genre: string | null;
  rating: RatingFilter | null;
  format: string | null;
  /** Year the book was finished */
  year: number | null;
  bookshelf: string | null;
}

export const EMPTY_LIBRARY_FILTERS: LibraryFilterState = {
  search: "",
  mood: null,
  genre: null,
  rating: null,
  format: null,
  year: null,
  bookshelf: null,
};

export const RATING_FILTER_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: "5", label: "★★★★★" },
  { value: "4+", label: "4★ +" },
  { value: "3+", label: "3★ +" },
  { value: "unrated", label: "unrated" },
];

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
}

/** Distinct filter values present in the given books. */
export function libraryFilterOptions(books: BookEntry[]): LibraryFilterOptions {
  const moods = new Set<string>();
  const genres = new Set<string>();
  const formats = new Set<string>();
  const years = new Set<number>();
  const bookshelves = new Set<string>();
  for (const b of books) {
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
  };
}

function matchesRating(rating: number, filter: RatingFilter): boolean {
  switch (filter) {
    case "5":
      return rating >= 5;
    case "4+":
      return rating >= 4;
    case "3+":
      return rating >= 3;
    case "unrated":
      return !rating;
  }
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
  if (f.genre && !(b.genres ?? []).includes(f.genre)) return false;
  if (f.rating && !matchesRating(b.rating ?? 0, f.rating)) return false;
  if (f.format && b.format !== f.format) return false;
  if (f.year != null && dateYear(b.dateFinished ?? "") !== f.year) return false;
  if (f.bookshelf && !(b.bookshelves ?? []).includes(f.bookshelf)) return false;
  return true;
}

/** Number of active filters, excluding search and mood (which have their own UI). */
export function activeFilterCount(f: LibraryFilterState): number {
  return [f.genre, f.rating, f.format, f.year, f.bookshelf].filter(
    (v) => v != null,
  ).length;
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
