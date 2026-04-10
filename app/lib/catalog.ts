import { apiFetch } from "@/lib/api";

export interface CatalogEntry {
  id: string;
  title: string;
  author: string;
  releaseDate: string;
  genres: string[];
}

interface BookRow {
  id: string;
  title: string;
  author: string;
  release_date: string;
  genres: string[];
}

function mapEntry(row: BookRow): CatalogEntry {
  return { id: row.id, title: row.title, author: row.author, releaseDate: row.release_date, genres: row.genres ?? [] };
}

// Searches Google Books
export async function searchCatalog(query: string): Promise<CatalogEntry[]> {
  if (!query.trim()) return [];
  const res = await apiFetch(`/api/catalog?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return (data as BookRow[]).map(mapEntry);
}

// Fetch the best-matching Google Books entry for a given title + author.
// Used to enrich book data when creating entries without a catalog selection.
export async function lookupBook(title: string, author?: string): Promise<CatalogEntry | null> {
  const q = [title, author].filter(Boolean).join(" ");
  const results = await searchCatalog(q);
  if (!results.length) return null;
  // Prefer an exact title match; fall back to first result
  return results.find((r) => r.title.toLowerCase() === title.toLowerCase()) ?? results[0];
}
