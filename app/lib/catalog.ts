import { supabase } from "./supabase";

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
  const { data, error } = await supabase
    .from("book_catalog")
    .select("*")
    .or(`title.ilike.%${query}%,author.ilike.%${query}%`)
    .order("title")
    .limit(6);
  if (error) throw error;
  return (data as CatalogRow[]).map(mapCatalog);
}

// Find existing catalog entry or create a new one
export async function findOrCreateCatalogEntry(
  title: string,
  author: string,
  releaseDate?: string,
  genres?: string[]
): Promise<CatalogEntry> {
  // Try exact match first
  const { data: existing } = await supabase
    .from("book_catalog")
    .select("*")
    .ilike("title", title)
    .ilike("author", author || "%")
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Merge in any new genres
    if (genres?.length) {
      const merged = Array.from(new Set([...(existing.genres ?? []), ...genres]));
      if (merged.length > (existing.genres ?? []).length) {
        await supabase.from("book_catalog").update({ genres: merged }).eq("id", existing.id);
        return mapCatalog({ ...existing, genres: merged } as CatalogRow);
      }
    }
    return mapCatalog(existing as CatalogRow);
  }

  const { data, error } = await supabase
    .from("book_catalog")
    .insert({ title, author: author ?? "", release_date: releaseDate ?? "", genres: genres ?? [] })
    .select()
    .single();
  if (error) throw error;
  return mapCatalog(data as CatalogRow);
}
