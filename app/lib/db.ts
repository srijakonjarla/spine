import { supabase } from "./supabase";
import type { BookEntry, BookRead, Thought } from "../types";

// ---- DB row shapes ----

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
  catalog_id: string;
  book_catalog: { title: string; author: string; genres: string[] };
  status: string;
  date_started: string | null;
  date_finished: string | null;
  date_shelved: string | null;
  rating: number;
  feeling: string;
  bookmarked: boolean;
  created_at: string;
  updated_at: string;
  thoughts?: ThoughtRow[];
  book_reads?: BookReadRow[];
}

interface ThoughtRow {
  id: string;
  book_id: string;
  text: string;
  created_at: string;
}

// ---- mapping ----

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
    title: row.book_catalog?.title ?? "",
    author: row.book_catalog?.author ?? "",
    genres: row.book_catalog?.genres ?? [],
    status: row.status as BookEntry["status"],
    dateStarted: row.date_started ?? "",
    dateFinished: row.date_finished ?? "",
    dateShelved: row.date_shelved ?? "",
    rating: row.rating,
    feeling: row.feeling,
    bookmarked: row.bookmarked ?? false,
    thoughts: (row.thoughts ?? [])
      .map((t) => ({ id: t.id, text: t.text, createdAt: t.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    reads: (row.book_reads ?? [])
      .map(mapBookRead)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- books ----

export async function getEntries(year?: number): Promise<BookEntry[]> {
  let query = supabase
    .from("books")
    .select("*, book_catalog(title, author, genres), thoughts(*), book_reads(*)")
    .order("updated_at", { ascending: false });
  if (year !== undefined) {
    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;
    query = query.or(
      `and(created_at.gte.${start},created_at.lt.${end}),` +
      `and(date_finished.gte.${start},date_finished.lt.${end}),` +
      `and(date_started.gte.${start},date_started.lt.${end}),` +
      `and(date_shelved.gte.${start},date_shelved.lt.${end})`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as BookRow[]).map(mapBook);
}

export async function getBookByCatalogId(catalogId: string): Promise<BookEntry | null> {
  const { data } = await supabase
    .from("books")
    .select("*, book_catalog(title, author, genres), thoughts(*), book_reads(*)")
    .eq("catalog_id", catalogId)
    .maybeSingle();
  if (!data) return null;
  return mapBook(data as BookRow);
}

export async function getEntry(id: string): Promise<BookEntry | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*, book_catalog(title, author, genres), thoughts(*), book_reads(*)")
    .eq("id", id)
    .single();
  if (error) return null;
  return mapBook(data as BookRow);
}

export async function createEntry(entry: BookEntry, catalogId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("books").insert({
    id: entry.id,
    status: entry.status,
    date_started: entry.dateStarted || null,
    date_finished: entry.dateFinished || null,
    date_shelved: entry.dateShelved || null,
    rating: entry.rating,
    feeling: entry.feeling,
    catalog_id: catalogId,
    user_id: user?.id ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  });
  if (error) throw error;
}

export async function updateEntry(
  id: string,
  patch: Partial<BookEntry>
): Promise<void> {
  // title/author/genres edits go to book_catalog, not books
  if ("title" in patch || "author" in patch || "genres" in patch) {
    const { data: book } = await supabase
      .from("books")
      .select("catalog_id")
      .eq("id", id)
      .single();
    if (book?.catalog_id) {
      const catalogPatch: Record<string, unknown> = {};
      if ("title" in patch) catalogPatch.title = patch.title!;
      if ("author" in patch) catalogPatch.author = patch.author!;
      if ("genres" in patch) catalogPatch.genres = patch.genres!;
      await supabase.from("book_catalog").update(catalogPatch).eq("id", book.catalog_id);
    }
  }

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("status" in patch) row.status = patch.status;
  if ("dateStarted" in patch) row.date_started = patch.dateStarted || null;
  if ("dateFinished" in patch) row.date_finished = patch.dateFinished || null;
  if ("dateShelved" in patch) row.date_shelved = patch.dateShelved || null;
  if ("rating" in patch) row.rating = patch.rating;
  if ("feeling" in patch) row.feeling = patch.feeling;
  if ("bookmarked" in patch) row.bookmarked = patch.bookmarked;

  const { error } = await supabase.from("books").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}

// ---- thoughts ----

export async function addThought(
  bookId: string,
  thought: Thought
): Promise<void> {
  const { error } = await supabase.from("thoughts").insert({
    id: thought.id,
    book_id: bookId,
    text: thought.text,
    created_at: thought.createdAt,
  });
  if (error) throw error;
  await supabase
    .from("books")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", bookId);
}

export async function removeThought(
  thoughtId: string,
  bookId: string
): Promise<void> {
  const { error } = await supabase
    .from("thoughts")
    .delete()
    .eq("id", thoughtId);
  if (error) throw error;
  await supabase
    .from("books")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", bookId);
}

// ---- re-reads ----

// Archives current read data to book_reads, then resets the book to "reading"
export async function startNewRead(entry: BookEntry): Promise<void> {
  const now = new Date().toISOString();
  // Archive the current read
  const { error: archiveError } = await supabase.from("book_reads").insert({
    book_id: entry.id,
    status: entry.status,
    date_started: entry.dateStarted || null,
    date_finished: entry.dateFinished || null,
    date_shelved: entry.dateShelved || null,
    rating: entry.rating,
    feeling: entry.feeling,
    created_at: entry.createdAt,
    updated_at: now,
  });
  if (archiveError) throw archiveError;

  // Reset the book to a new reading session
  const { error: resetError } = await supabase.from("books").update({
    status: "reading",
    date_started: now.split("T")[0],
    date_finished: null,
    date_shelved: null,
    rating: 0,
    feeling: "",
    updated_at: now,
  }).eq("id", entry.id);
  if (resetError) throw resetError;
}

export async function deleteBookRead(id: string): Promise<void> {
  const { error } = await supabase.from("book_reads").delete().eq("id", id);
  if (error) throw error;
}

// Inserts a historical read entry directly (used during import)
export async function addImportedRead(bookId: string, entry: BookEntry): Promise<void> {
  const { error } = await supabase.from("book_reads").insert({
    book_id: bookId,
    status: entry.status,
    date_started: entry.dateStarted || null,
    date_finished: entry.dateFinished || null,
    date_shelved: entry.dateShelved || null,
    rating: entry.rating,
    feeling: entry.feeling,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  });
  if (error) throw error;
}
