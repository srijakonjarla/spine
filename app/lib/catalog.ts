export interface CatalogEntry {
  id: string;
  title: string;
  author: string;
  releaseDate: string;
  genres: string[];
  coverUrl: string;
  isbn: string;
  pageCount: number | null;
  /** Set when this result comes from the user's own library */
  status?: string;
  /** The library book id (user_books.id), if this result is from the user's library */
  bookId?: string;
  /** The catalog book id (catalog_books.id), if this result is from the user's library */
  catalogBookId?: string;
}

interface BookRow {
  id: string;
  title: string;
  author: string;
  release_date: string;
  genres: string[];
  cover_url?: string;
  isbn?: string;
  page_count?: number | null;
}

function mapEntry(row: BookRow): CatalogEntry {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    releaseDate: row.release_date,
    genres: row.genres ?? [],
    coverUrl: row.cover_url ?? "",
    isbn: row.isbn ?? "",
    pageCount: row.page_count ?? null,
  };
}

// Searches Google Books
export async function searchCatalog(query: string): Promise<CatalogEntry[]> {
  if (!query.trim()) {
    return [];
  }
  const res = await fetch(`/api/catalog?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return (data as BookRow[]).map(mapEntry);
}

// Fetch the best-matching Google Books entry.
// Pass an ISBN for exact lookup, or title + optional author for a text search.
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
  // Prefer an exact title match; fall back to first result
  return (
    results.find((r) => r.title.toLowerCase() === titleOrIsbn.toLowerCase()) ??
    results[0]
  );
}
