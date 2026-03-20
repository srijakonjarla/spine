import { supabase } from "./supabase";
import type { BookList, ListItem } from "../types";

interface ListRow {
  id: string;
  year: number;
  title: string;
  description: string;
  list_type: string;
  date_label: string;
  notes_label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  list_items?: ListItemRow[];
}

interface ListItemRow {
  id: string;
  list_id: string;
  catalog_id: string;
  release_date: string;
  notes: string;
  sort_order: number;
  created_at: string;
  book_catalog: { title: string; author: string } | null;
}

function mapItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    listId: row.list_id,
    catalogId: row.catalog_id,
    title: row.book_catalog?.title ?? "",
    author: row.book_catalog?.author ?? "",
    releaseDate: row.release_date,
    notes: row.notes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function mapList(row: ListRow): BookList {
  return {
    id: row.id,
    year: row.year,
    title: row.title,
    description: row.description,
    listType: row.list_type ?? "general",
    dateLabel: row.date_label ?? "",
    notesLabel: row.notes_label ?? "notes",
    sortOrder: row.sort_order,
    items: (row.list_items ?? [])
      .map(mapItem)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    bookmarked: (row as any).bookmarked ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function toggleListBookmark(id: string, bookmarked: boolean): Promise<void> {
  const { error } = await supabase.from("lists").update({ bookmarked }).eq("id", id);
  if (error) throw error;
}

export async function getLists(year: number): Promise<BookList[]> {
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_items(*, book_catalog(title, author))")
    .eq("year", year)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as ListRow[]).map(mapList);
}

export async function getList(id: string): Promise<BookList | null> {
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_items(*, book_catalog(title, author))")
    .eq("id", id)
    .single();
  if (error) return null;
  return mapList(data as ListRow);
}

export async function createList(
  year: number,
  title: string,
  opts?: { listType?: string; dateLabel?: string; notesLabel?: string }
): Promise<BookList> {
  const { data, error } = await supabase
    .from("lists")
    .insert({
      year,
      title,
      list_type: opts?.listType ?? "general",
      date_label: opts?.dateLabel ?? "",
      notes_label: opts?.notesLabel ?? "notes",
    })
    .select("*, list_items(*, book_catalog(title, author))")
    .single();
  if (error) throw error;
  return mapList(data as ListRow);
}

export async function updateList(
  id: string,
  patch: { title?: string; description?: string; dateLabel?: string; notesLabel?: string }
): Promise<void> {
  const row: Record<string, string> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.dateLabel !== undefined) row.date_label = patch.dateLabel;
  if (patch.notesLabel !== undefined) row.notes_label = patch.notesLabel;
  const { error } = await supabase.from("lists").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) throw error;
}

export async function addListItem(
  listId: string,
  fields: { catalogId: string; releaseDate?: string; notes?: string }
): Promise<ListItem> {
  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      catalog_id: fields.catalogId,
      release_date: fields.releaseDate ?? "",
      notes: fields.notes ?? "",
    })
    .select("*, book_catalog(title, author)")
    .single();
  if (error) throw error;
  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId);
  return mapItem(data as ListItemRow);
}

export async function updateListItem(
  id: string,
  patch: { releaseDate?: string; notes?: string }
): Promise<void> {
  const row: Record<string, string> = {};
  if (patch.releaseDate !== undefined) row.release_date = patch.releaseDate;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("list_items").update(row).eq("id", id);
  if (error) throw error;
}

export async function reorderListItems(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("list_items").update({ sort_order: i }).eq("id", id)
    )
  );
}

export async function reorderLists(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("lists").update({ sort_order: i }).eq("id", id)
    )
  );
}

export async function removeListItem(id: string, listId: string): Promise<void> {
  const { error } = await supabase.from("list_items").delete().eq("id", id);
  if (error) throw error;
  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId);
}
