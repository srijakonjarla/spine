import { apiFetch } from "./api";

export interface CatalogEntry {
  id: string;
  title: string;
  author: string;
  releaseDate: string;
  genres: string[];
}

interface CatalogRow {
  id: string;
  title: string;
  author: string;
  release_date: string;
  genres: string[];
}

function mapCatalog(row: CatalogRow): CatalogEntry {
  return { id: row.id, title: row.title, author: row.author, releaseDate: row.release_date, genres: row.genres ?? [] };
}

export async function searchCatalog(query: string): Promise<CatalogEntry[]> {
  if (!query.trim()) return [];
  const res = await apiFetch(`/api/catalog?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return (data as CatalogRow[]).map(mapCatalog);
}

export async function findOrCreateCatalogEntry(
  title: string,
  author: string,
  releaseDate?: string,
  genres?: string[]
): Promise<CatalogEntry> {
  const res = await apiFetch("/api/catalog", {
    method: "POST",
    body: JSON.stringify({ title, author, releaseDate, genres }),
  });
  const data = await res.json();
  return mapCatalog(data as CatalogRow);
}
