import { apiFetch } from "@/lib/api";
import type { Quote } from "@/types";

interface QuoteRow {
  id: string;
  book_id: string | null;
  text: string;
  page_number: string;
  created_at: string;
  user_books?: { title_override: string | null; catalog_books: { title: string } | null } | null;
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
  const data: QuoteRow[] = await res.json();
  return data.map(mapQuote);
}

export async function addQuote(text: string, bookId?: string, pageNumber?: string): Promise<Quote> {
  const res = await apiFetch("/api/quotes", {
    method: "POST",
    body: JSON.stringify({ text, bookId: bookId ?? null, pageNumber: pageNumber ?? "" }),
  });
  const row: QuoteRow = await res.json();
  return mapQuote(row);
}

export async function deleteQuote(id: string): Promise<void> {
  await apiFetch(`/api/quotes/${id}`, { method: "DELETE" });
}
