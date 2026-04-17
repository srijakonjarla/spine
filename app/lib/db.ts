import { apiFetch } from "./api";
import type { BookEntry, BookRead, Thought } from "@/types";

// ---- mapping ----

interface BookReadRow {
  id: string;
  book_id: string;
  status: string;
  date_started: string | null;
  date_finished: string | null;
  date_shelved: string | null;
  rating: number;
  feeling: string;
  created_at: string;
  updated_at: string;
}

interface BookRow {
  id: string;
  catalog_book_id: string;
  title: string;
  author: string;
  release_date: string;
  genres: string[];
  mood_tags: string[];
  bookshelves: string[];
  status: string;
  date_started: string | null;
  date_finished: string | null;
  date_shelved: string | null;
  rating: number;
  feeling: string;
  bookmarked: boolean;
  cover_url: string;
  isbn: string;
  page_count: number | null;
  created_at: string;
  updated_at: string;
  thoughts?: ThoughtRow[];
  book_reads?: BookReadRow[];
}

interface ThoughtRow {
  id: string;
  book_id: string;
  text: string;
  page_number?: number | null;
  created_at: string;
}

function mapBookRead(row: BookReadRow): BookRead {
  return {
    id: row.id,
    bookId: row.book_id,
    status: row.status as BookRead["status"],
    dateStarted: row.date_started ?? "",
    dateFinished: row.date_finished ?? "",
    dateShelved: row.date_shelved ?? "",
    rating: row.rating,
    feeling: row.feeling,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBook(row: BookRow): BookEntry {
  return {
    id: row.id,
    catalogBookId: row.catalog_book_id ?? "",
    title: row.title ?? "",
    author: row.author ?? "",
    releaseDate: row.release_date ?? "",
    genres: row.genres ?? [],
    moodTags: row.mood_tags ?? [],
    bookshelves: row.bookshelves ?? [],
    status: row.status as BookEntry["status"],
    dateStarted: row.date_started ?? "",
    dateFinished: row.date_finished ?? "",
    dateShelved: row.date_shelved ?? "",
    rating: row.rating,
    feeling: row.feeling,
    bookmarked: row.bookmarked ?? false,
    coverUrl: row.cover_url ?? "",
    isbn: row.isbn ?? "",
    pageCount: row.page_count ?? null,
    thoughts: (row.thoughts ?? [])
      .map((t) => ({
        id: t.id,
        text: t.text,
        pageNumber: t.page_number ?? null,
        createdAt: t.created_at,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    reads: (row.book_reads ?? [])
      .map(mapBookRead)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- books ----

export async function getEntries(opts?: {
  year?: number;
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<BookEntry[]> {
  const params = new URLSearchParams();
  if (opts?.year) params.set("year", String(opts.year));
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.status) {
    switch (opts.status) {
      case "finished":
        params.set("order", "date_finished.desc");
        break;
      case "reading":
        params.set("order", "date_started.desc");
        break;
      case "did-not-finish":
        params.set("order", "date_shelved.desc");
        break;
    }
  }
  const qs = params.toString();
  const res = await apiFetch(qs ? `/api/books?${qs}` : "/api/books");
  const data = await res.json();
  const rows = Array.isArray(data) ? data : data.data;
  return (rows as BookRow[]).map(mapBook);
}

export async function getEntry(id: string): Promise<BookEntry | null> {
  let res: Response;
  try {
    res = await apiFetch(`/api/books/${id}`);
  } catch (err) {
    // 404 means the book doesn't exist (or belongs to another user) — return null
    // so callers can redirect gracefully instead of crashing.
    if (err instanceof Error && err.message.startsWith("API error 404"))
      return null;
    throw err;
  }
  const data = await res.json();
  if (!data) return null;
  return mapBook(data as BookRow);
}

export async function createEntry(entry: BookEntry): Promise<void> {
  await apiFetch("/api/books", {
    method: "POST",
    body: JSON.stringify({ entry }),
  });
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

// ---- thoughts ----

export async function addThought(
  bookId: string,
  thought: Thought,
): Promise<void> {
  await apiFetch(`/api/books/${bookId}/thoughts`, {
    method: "POST",
    body: JSON.stringify({ thought }),
  });
}

export async function removeThought(
  thoughtId: string,
  bookId: string,
): Promise<void> {
  await apiFetch(`/api/books/${bookId}/thoughts`, {
    method: "DELETE",
    body: JSON.stringify({ thoughtId }),
  });
}

// ---- re-reads ----

export async function startNewRead(entry: BookEntry): Promise<void> {
  await apiFetch(`/api/books/${entry.id}/reads`, {
    method: "POST",
    body: JSON.stringify({ entry }),
  });
}

export async function deleteBookRead(id: string): Promise<void> {
  await apiFetch(`/api/reads/${id}`, { method: "DELETE" });
}

export async function logHistoricalRead(
  bookId: string,
  read: {
    status: string;
    dateStarted: string;
    dateFinished: string;
    rating: number;
    feeling: string;
  },
): Promise<BookRead> {
  const res = await apiFetch(`/api/books/${bookId}/reads`, {
    method: "PUT",
    body: JSON.stringify(read),
  });
  const row: BookReadRow = await res.json();
  return mapBookRead(row);
}

export async function updateBookRead(
  bookId: string,
  readId: string,
  patch: {
    status: string;
    dateStarted: string;
    dateFinished: string;
    rating: number;
    feeling: string;
  },
): Promise<BookRead> {
  const res = await apiFetch(`/api/books/${bookId}/reads/${readId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const row: BookReadRow = await res.json();
  return mapBookRead(row);
}
