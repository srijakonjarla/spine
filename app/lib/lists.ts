import { apiFetch } from "./api";
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
  bookmarked: boolean;
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
    bookmarked: row.bookmarked ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLists(year: number): Promise<BookList[]> {
  const res = await apiFetch(`/api/lists?year=${year}`);
  const data = await res.json();
  return (data as ListRow[]).map(mapList);
}

export async function getList(id: string): Promise<BookList | null> {
  const res = await apiFetch(`/api/lists/${id}`);
  const data = await res.json();
  if (!data) return null;
  return mapList(data as ListRow);
}

export async function createList(
  year: number,
  title: string,
  opts?: { listType?: string; dateLabel?: string; notesLabel?: string }
): Promise<BookList> {
  const res = await apiFetch("/api/lists", {
    method: "POST",
    body: JSON.stringify({ year, title, ...opts }),
  });
  const data = await res.json();
  return mapList(data as ListRow);
}

export async function updateList(
  id: string,
  patch: { title?: string; description?: string; dateLabel?: string; notesLabel?: string }
): Promise<void> {
  await apiFetch(`/api/lists/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function toggleListBookmark(id: string, bookmarked: boolean): Promise<void> {
  await apiFetch(`/api/lists/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ bookmarked }),
  });
}

export async function deleteList(id: string): Promise<void> {
  await apiFetch(`/api/lists/${id}`, { method: "DELETE" });
}

export async function addListItem(
  listId: string,
  fields: { catalogId: string; releaseDate?: string; notes?: string }
): Promise<ListItem> {
  const res = await apiFetch(`/api/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  return mapItem(data as ListItemRow);
}

export async function updateListItem(
  id: string,
  patch: { releaseDate?: string; notes?: string }
): Promise<void> {
  await apiFetch(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function removeListItem(id: string, listId: string): Promise<void> {
  await apiFetch(`/api/lists/${listId}/items/${id}`, { method: "DELETE" });
}

export async function reorderListItems(orderedIds: string[]): Promise<void> {
  await apiFetch("/api/items/reorder", {
    method: "POST",
    body: JSON.stringify({ orderedIds }),
  });
}

export async function reorderLists(orderedIds: string[]): Promise<void> {
  await apiFetch("/api/lists/reorder", {
    method: "POST",
    body: JSON.stringify({ orderedIds }),
  });
}
