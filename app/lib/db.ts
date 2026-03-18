import { supabase } from "./supabase";
import type { BookEntry, Thought } from "../types";

// ---- DB row shapes ----

interface BookRow {
  id: string;
  title: string;
  author: string;
  status: string;
  date_started: string | null;
  date_finished: string | null;
  date_shelved: string | null;
  rating: number;
  feeling: string;
  created_at: string;
  updated_at: string;
  thoughts?: ThoughtRow[];
}

interface ThoughtRow {
  id: string;
  book_id: string;
  text: string;
  created_at: string;
}

// ---- mapping ----

function mapBook(row: BookRow): BookEntry {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    status: row.status as BookEntry["status"],
    dateStarted: row.date_started ?? "",
    dateFinished: row.date_finished ?? "",
    dateShelved: row.date_shelved ?? "",
    rating: row.rating,
    feeling: row.feeling,
    thoughts: (row.thoughts ?? [])
      .map((t) => ({ id: t.id, text: t.text, createdAt: t.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- books ----

export async function getEntries(year?: number): Promise<BookEntry[]> {
  let query = supabase
    .from("books")
    .select("*, thoughts(*)")
    .order("updated_at", { ascending: false });
  if (year !== undefined) {
    query = query
      .gte("created_at", `${year}-01-01`)
      .lt("created_at", `${year + 1}-01-01`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as BookRow[]).map(mapBook);
}

export async function getEntry(id: string): Promise<BookEntry | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*, thoughts(*)")
    .eq("id", id)
    .single();
  if (error) return null;
  return mapBook(data as BookRow);
}

export async function createEntry(entry: BookEntry, catalogId?: string): Promise<void> {
  const { error } = await supabase.from("books").insert({
    id: entry.id,
    title: entry.title,
    author: entry.author,
    status: entry.status,
    date_started: entry.dateStarted || null,
    date_finished: entry.dateFinished || null,
    date_shelved: entry.dateShelved || null,
    rating: entry.rating,
    feeling: entry.feeling,
    catalog_id: catalogId ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  });
  if (error) throw error;
}

export async function updateEntry(
  id: string,
  patch: Partial<BookEntry>
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in patch) row.title = patch.title;
  if ("author" in patch) row.author = patch.author;
  if ("status" in patch) row.status = patch.status;
  if ("dateStarted" in patch) row.date_started = patch.dateStarted || null;
  if ("dateFinished" in patch) row.date_finished = patch.dateFinished || null;
  if ("dateShelved" in patch) row.date_shelved = patch.dateShelved || null;
  if ("rating" in patch) row.rating = patch.rating;
  if ("feeling" in patch) row.feeling = patch.feeling;

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
