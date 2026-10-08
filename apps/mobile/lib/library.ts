import type { BookEntry, BookRead, Quote } from "@spine/shared";
import { apiFetch, publicFetch } from "./api";

export interface CatalogEntry {
  id: string;
  hardcoverBookId: number | null;
  title: string;
  author: string;
  releaseDate: string;
  genres: string[];
  diversityTags: string[];
  coverUrl: string;
  isbn: string;
  pageCount: number | null;
  publisher: string;
  audioDurationMinutes: number | null;
  status?: string;
  bookId?: string;
  catalogBookId?: string;
}

interface ThoughtRow {
  id: string;
  text: string;
  page_number?: number | null;
  created_at: string;
}

interface BookReadRow {
  id: string;
  book_id?: string;
  status?: string;
  date_started?: string | null;
  date_finished?: string | null;
  date_shelved?: string | null;
  date_dnfed?: string | null;
  rating?: number | null;
  feeling?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface BookRow {
  id: string;
  catalog_book_id?: string;
  hardcover_book_id?: number | null;
  title: string;
  author: string;
  publisher?: string;
  release_date?: string;
  genres?: string[];
  user_genres?: string[];
  mood_tags?: string[];
  diversity_tags?: string[];
  user_diversity_tags?: string[];
  bookshelves?: string[];
  status: string;
  format?: string;
  audio_duration_minutes?: number | null;
  date_started?: string | null;
  date_finished?: string | null;
  date_shelved?: string | null;
  date_dnfed?: string | null;
  rating?: number;
  feeling?: string;
  bookmarked?: boolean;
  up_next?: boolean;
  cover_url?: string;
  isbn?: string;
  page_count?: number | null;
  created_at: string;
  updated_at: string;
  thoughts?: ThoughtRow[];
  book_reads?: BookReadRow[];
}

interface CatalogRow {
  id: string;
  hardcover_book_id?: number | null;
  title: string;
  author: string;
  release_date?: string;
  genres?: string[];
  diversity_tags?: string[];
  cover_url?: string;
  isbn?: string;
  page_count?: number | null;
  publisher?: string;
  audio_duration_minutes?: number | null;
}

function mapBook(row: BookRow): BookEntry {
  return {
    id: row.id,
    catalogBookId: row.catalog_book_id ?? "",
    hardcoverBookId: row.hardcover_book_id ?? null,
    title: row.title ?? "",
    author: row.author ?? "",
    publisher: row.publisher ?? "",
    releaseDate: row.release_date ?? "",
    genres: row.genres ?? [],
    userGenres: row.user_genres ?? [],
    moodTags: row.mood_tags ?? [],
    diversityTags: row.diversity_tags ?? [],
    userDiversityTags: row.user_diversity_tags ?? [],
    bookshelves: row.bookshelves ?? [],
    status: row.status as BookEntry["status"],
    format: row.format ?? "",
    audioDurationMinutes: row.audio_duration_minutes ?? null,
    dateStarted: row.date_started ?? "",
    dateFinished: row.date_finished ?? "",
    dateShelved: row.date_shelved ?? "",
    dateDnfed: row.date_dnfed ?? "",
    rating: row.rating ?? 0,
    feeling: row.feeling ?? "",
    bookmarked: row.bookmarked ?? false,
    upNext: row.up_next ?? false,
    coverUrl: row.cover_url ?? "",
    isbn: row.isbn ?? "",
    pageCount: row.page_count ?? null,
    thoughts: (row.thoughts ?? []).map((t) => ({
      id: t.id,
      text: t.text ?? "",
      pageNumber: t.page_number ?? null,
      createdAt: t.created_at,
    })),
    reads: (row.book_reads ?? []).map(mapRead),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRead(r: BookReadRow): BookRead {
  return {
    id: r.id,
    bookId: r.book_id ?? "",
    status: (r.status ?? "finished") as BookRead["status"],
    dateStarted: r.date_started ?? "",
    dateFinished: r.date_finished ?? "",
    dateShelved: r.date_shelved ?? "",
    dateDnfed: r.date_dnfed ?? "",
    rating: r.rating ?? 0,
    feeling: r.feeling ?? "",
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
  };
}

function mapCatalog(row: CatalogRow): CatalogEntry {
  return {
    id: row.id,
    hardcoverBookId: row.hardcover_book_id ?? null,
    title: row.title,
    author: row.author,
    releaseDate: row.release_date ?? "",
    genres: row.genres ?? [],
    diversityTags: row.diversity_tags ?? [],
    coverUrl: row.cover_url ?? "",
    isbn: row.isbn ?? "",
    pageCount: row.page_count ?? null,
    publisher: row.publisher ?? "",
    audioDurationMinutes: row.audio_duration_minutes ?? null,
  };
}

/**
 * Lists the user's library. `nested` also joins thoughts + book_reads,
 * which re-read stats and the month/day views depend on.
 */
export async function getEntries(opts?: {
  include?: "nested";
}): Promise<BookEntry[]> {
  const qs = opts?.include ? `?include=${opts.include}` : "";
  const res = await apiFetch(`/api/books${qs}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : data.data;
  return (rows as BookRow[]).map(mapBook);
}

export async function searchCatalog(query: string): Promise<CatalogEntry[]> {
  if (!query.trim()) return [];
  const res = await publicFetch(`/api/catalog?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return (data as CatalogRow[]).map(mapCatalog);
}

export async function lookupBook(
  titleOrIsbn: string,
  author?: string,
): Promise<CatalogEntry | null> {
  const digits = titleOrIsbn.replace(/[-\s]/g, "");
  const isIsbn = /^\d{10}$/.test(digits) || /^\d{13}$/.test(digits);
  if (isIsbn) {
    const results = await searchCatalog(digits);
    return results[0] ?? null;
  }
  const q = [titleOrIsbn, author].filter(Boolean).join(" ");
  const results = await searchCatalog(q);
  if (!results.length) return null;
  return (
    results.find((r) => r.title.toLowerCase() === titleOrIsbn.toLowerCase()) ??
    results[0]
  );
}

export interface CoverEdition {
  id: number;
  coverUrl: string;
  isbn: string;
  publisher: string;
}

/** A book's other cover-bearing editions, so the user can swap covers. */
export async function fetchCoverEditions(
  entry: Pick<BookEntry, "hardcoverBookId" | "isbn" | "title" | "author">,
): Promise<CoverEdition[]> {
  const params: [string, string][] = [["title", entry.title]];
  if (entry.hardcoverBookId)
    params.push(["hardcoverBookId", String(entry.hardcoverBookId)]);
  if (entry.isbn) params.push(["isbn", entry.isbn]);
  if (entry.author) params.push(["author", entry.author]);
  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const res = await apiFetch(`/api/catalog/editions?${qs}`);
  const data = (await res.json()) as { editions?: CoverEdition[] };
  return data.editions ?? [];
}

export async function createEntry(entry: BookEntry): Promise<{ id: string }> {
  const res = await apiFetch("/api/books", {
    method: "POST",
    body: JSON.stringify({ entry }),
  });
  const data = await res.json();
  return { id: data.id ?? entry.id };
}

export async function getEntry(id: string): Promise<BookEntry | null> {
  const res = await apiFetch(`/api/books/${id}`);
  const data = await res.json();
  if (!data) return null;
  return mapBook(data as BookRow);
}

export async function updateEntry(
  id: string,
  patch: Partial<BookEntry>,
): Promise<void> {
  await apiFetch(`/api/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteEntry(id: string): Promise<void> {
  await apiFetch(`/api/books/${id}`, { method: "DELETE" });
}

// ─── Re-reads ────────────────────────────────────────────────────

/**
 * Archives the current read into book_reads and resets the entry to a
 * fresh "reading" read (server-side `start_new_read` RPC).
 */
export async function startNewRead(entry: BookEntry): Promise<void> {
  await apiFetch(`/api/books/${entry.id}/reads`, {
    method: "POST",
    body: JSON.stringify({ entry }),
  });
}

/** Logs a past read without touching the current entry. */
export async function logPastRead(
  bookId: string,
  read: {
    dateStarted: string;
    dateFinished: string;
    rating: number;
    feeling: string;
  },
): Promise<BookRead> {
  const res = await apiFetch(`/api/books/${bookId}/reads`, {
    method: "PUT",
    body: JSON.stringify({ ...read, status: "finished" }),
  });
  return mapRead((await res.json()) as BookReadRow);
}

export type ReadPatch = Pick<
  BookRead,
  "dateStarted" | "dateFinished" | "rating" | "feeling"
>;

/** Edits a past read's dates / rating / reflection. */
export async function updateRead(
  bookId: string,
  readId: string,
  patch: ReadPatch,
): Promise<BookRead> {
  const res = await apiFetch(`/api/books/${bookId}/reads/${readId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch, status: "finished" }),
  });
  return mapRead((await res.json()) as BookReadRow);
}

export async function deleteRead(
  bookId: string,
  readId: string,
): Promise<void> {
  await apiFetch(`/api/books/${bookId}/reads/${readId}`, { method: "DELETE" });
}

export async function addThought(
  bookId: string,
  thought: {
    id: string;
    text: string;
    pageNumber: number | null;
    createdAt: string;
  },
): Promise<void> {
  await apiFetch(`/api/books/${bookId}/thoughts`, {
    method: "POST",
    body: JSON.stringify({ thought }),
  });
}

export async function removeThought(
  bookId: string,
  thoughtId: string,
): Promise<void> {
  await apiFetch(`/api/books/${bookId}/thoughts`, {
    method: "DELETE",
    body: JSON.stringify({ thoughtId }),
  });
}

interface QuoteRow {
  id: string;
  book_id: string | null;
  text: string;
  page_number: string;
  created_at: string;
  user_books?: {
    title_override: string | null;
    catalog_books: { title: string } | null;
  } | null;
}

function mapQuote(row: QuoteRow): Quote {
  const ub = row.user_books;
  return {
    id: row.id,
    bookId: row.book_id,
    bookTitle: ub?.title_override ?? ub?.catalog_books?.title,
    text: row.text,
    pageNumber: row.page_number,
    createdAt: row.created_at,
  };
}

export async function getQuotes(bookId?: string): Promise<Quote[]> {
  const qs = bookId ? `?bookId=${bookId}` : "";
  const res = await apiFetch(`/api/quotes${qs}`);
  const data = (await res.json()) as QuoteRow[];
  return data.map(mapQuote);
}

export async function addQuote(
  text: string,
  bookId: string,
  pageNumber: string,
): Promise<Quote> {
  const res = await apiFetch("/api/quotes", {
    method: "POST",
    body: JSON.stringify({ text, bookId, pageNumber }),
  });
  return mapQuote((await res.json()) as QuoteRow);
}

export async function deleteQuote(id: string): Promise<void> {
  await apiFetch(`/api/quotes/${id}`, { method: "DELETE" });
}

export type { BookEntry };
