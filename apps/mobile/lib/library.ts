import type { BookEntry } from "@spine/shared";
import { apiFetch, publicFetch } from "./api";

export interface CatalogEntry {
  id: string;
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

interface BookRow {
  id: string;
  catalog_book_id?: string;
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
  rating?: number;
  feeling?: string;
  bookmarked?: boolean;
  up_next?: boolean;
  cover_url?: string;
  isbn?: string;
  page_count?: number | null;
  created_at: string;
  updated_at: string;
}

interface CatalogRow {
  id: string;
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
    rating: row.rating ?? 0,
    feeling: row.feeling ?? "",
    bookmarked: row.bookmarked ?? false,
    upNext: row.up_next ?? false,
    coverUrl: row.cover_url ?? "",
    isbn: row.isbn ?? "",
    pageCount: row.page_count ?? null,
    thoughts: [],
    reads: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCatalog(row: CatalogRow): CatalogEntry {
  return {
    id: row.id,
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

export async function getEntries(): Promise<BookEntry[]> {
  const res = await apiFetch("/api/books");
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

export async function createEntry(entry: BookEntry): Promise<{ id: string }> {
  const res = await apiFetch("/api/books", {
    method: "POST",
    body: JSON.stringify({ entry }),
  });
  const data = await res.json();
  return { id: data.id ?? entry.id };
}

export type { BookEntry };
