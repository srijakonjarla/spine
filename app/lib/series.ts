import { apiFetch } from "@/lib/api";

export interface SeriesBook {
  id: string;
  title: string;
  position: number;
  status: "read" | "reading" | "unread" | "skipped";
  bookId: string | null;
  coverUrl: string;
}

export interface Series {
  id: string;
  name: string;
  author: string;
  books: SeriesBook[];
  createdAt: string;
}

interface SeriesRow {
  id: string;
  name: string;
  author: string;
  created_at: string;
  series_books: {
    id: string;
    title: string;
    position: number;
    status: string;
    book_id: string | null;
    cover_url: string;
  }[];
}

function mapSeries(row: SeriesRow): Series {
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    createdAt: row.created_at,
    books: (row.series_books ?? [])
      .sort((a, b) => a.position - b.position)
      .map((b) => ({
        id: b.id,
        title: b.title,
        position: b.position,
        status: b.status as SeriesBook["status"],
        bookId: b.book_id,
        coverUrl: b.cover_url ?? "",
      })),
  };
}

export async function getSeries(): Promise<Series[]> {
  const res = await apiFetch("/api/series");
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return (data as SeriesRow[]).map(mapSeries);
}

export async function createSeries(
  name: string,
  author: string,
): Promise<Series> {
  const res = await apiFetch("/api/series", {
    method: "POST",
    body: JSON.stringify({ name, author }),
  });
  return mapSeries(await res.json());
}

export async function updateSeries(
  id: string,
  patch: { name?: string; author?: string },
): Promise<void> {
  await apiFetch(`/api/series/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteSeries(id: string): Promise<void> {
  await apiFetch(`/api/series/${id}`, { method: "DELETE" });
}

export async function addSeriesBook(
  seriesId: string,
  title: string,
  position: number,
  catalog?: {
    coverUrl?: string;
    author?: string;
    isbn?: string;
    releaseDate?: string;
    genres?: string[];
    pageCount?: number | null;
    bookId?: string;
  },
  status?: SeriesBook["status"],
): Promise<SeriesBook> {
  const res = await apiFetch(`/api/series/${seriesId}/books`, {
    method: "POST",
    body: JSON.stringify({
      title,
      position,
      catalog,
      ...(status ? { status } : {}),
    }),
  });
  const b = await res.json();
  return {
    id: b.id,
    title: b.title,
    position: b.position,
    status: b.status,
    bookId: b.book_id,
    coverUrl: b.cover_url ?? "",
  };
}

export async function updateSeriesBook(
  seriesId: string,
  bookId: string,
  status: SeriesBook["status"],
): Promise<void> {
  await apiFetch(`/api/series/${seriesId}/books/${bookId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteSeriesBook(
  seriesId: string,
  bookId: string,
): Promise<void> {
  await apiFetch(`/api/series/${seriesId}/books/${bookId}`, {
    method: "DELETE",
  });
}

export async function reorderSeriesBooks(
  seriesId: string,
  orderedIds: string[],
): Promise<void> {
  await apiFetch(`/api/series/${seriesId}/books/reorder`, {
    method: "POST",
    body: JSON.stringify({ orderedIds }),
  });
}
