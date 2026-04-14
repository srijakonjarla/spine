/**
 * Server-only utility for auto-syncing series from Hardcover.
 * Called after a book is created/status-changed, and from the bulk sync route.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const HC_ENDPOINT = "https://api.hardcover.app/v1/graphql";

const SEARCH_QUERY = `
  query SearchBook($query: String!) {
    search(query: $query, query_type: "Book", per_page: 1) {
      results
    }
  }
`;

const DETAILS_QUERY = `
  query GetBookDetails($id: Int!) {
    books(where: { id: { _eq: $id } }) {
      book_series {
        position
        series { name }
      }
    }
  }
`;

async function hcPost(query: string, variables: Record<string, unknown>) {
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) return null;
  const res = await fetch(HC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function getHardcoverId(title: string, author: string): Promise<number | null> {
  const json = await hcPost(SEARCH_QUERY, { query: [title, author].filter(Boolean).join(" ") });
  const raw = json?.data?.search?.results;
  if (!raw) return null;
  const parsed: { hits?: { document: { id?: number | string; title?: string } }[] } =
    typeof raw === "string" ? JSON.parse(raw) : raw;
  const hit = parsed?.hits?.[0]?.document;
  if (!hit?.id || !hit.title) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!norm(hit.title).startsWith(norm(title).slice(0, 5))) return null;
  return Number(hit.id);
}

interface HCSeries { position: number | null; series: { name: string } | null }

async function getBookSeriesFromHC(hcId: number): Promise<HCSeries[]> {
  const json = await hcPost(DETAILS_QUERY, { id: hcId });
  return json?.data?.books?.[0]?.book_series ?? [];
}

export function toSeriesStatus(libraryStatus: string): "read" | "reading" | "unread" {
  if (libraryStatus === "finished") return "read";
  if (libraryStatus === "reading")  return "reading";
  return "unread";
}

/**
 * For a single book, looks it up on Hardcover and upserts series tracker entries.
 * Safe to call multiple times — skips books already present in a series.
 */
export async function syncBookSeries(
  supabase: SupabaseClient,
  userId: string,
  book: { id: string; title: string; author: string; status: string; coverUrl: string }
): Promise<void> {
  // Only worth syncing for books the user has actually read or is reading
  if (!["finished", "reading"].includes(book.status)) return;

  const hcId = await getHardcoverId(book.title, book.author);
  if (!hcId) return;

  const seriesEntries = await getBookSeriesFromHC(hcId);
  if (!seriesEntries.length) return;

  for (const entry of seriesEntries) {
    const seriesName = entry.series?.name;
    if (!seriesName) continue;

    // Find or create the series
    let seriesId: string;
    const { data: existing } = await supabase
      .from("series")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", seriesName)
      .maybeSingle();

    if (existing) {
      seriesId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("series")
        .insert({ user_id: userId, name: seriesName, author: book.author })
        .select("id")
        .single();
      if (error || !created) continue;
      seriesId = created.id;
    }

    // Check if this book is already in the series
    const { data: existingBook } = await supabase
      .from("series_books")
      .select("id")
      .eq("series_id", seriesId)
      .ilike("title", book.title)
      .maybeSingle();

    if (existingBook) {
      // Update status in case it changed (e.g. want-to-read → finished)
      await supabase
        .from("series_books")
        .update({ status: toSeriesStatus(book.status) })
        .eq("id", existingBook.id);
      continue;
    }

    // Count existing books to determine fallback position
    const { count } = await supabase
      .from("series_books")
      .select("id", { count: "exact", head: true })
      .eq("series_id", seriesId);

    await supabase.from("series_books").insert({
      series_id: seriesId,
      title: book.title,
      position: entry.position ?? (count ?? 0) + 1,
      status: toSeriesStatus(book.status),
      cover_url: book.coverUrl ?? "",
      book_id: book.id,
    });
  }
}
