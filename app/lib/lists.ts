import { apiFetch } from "@/lib/api";
import type { BookList, ListItem } from "@/types";

interface ListRow {
  id: string;
  year: number;
  title: string;
  description: string;
  list_type: string;
  color: string;
  emoji: string;
  bullet_symbol: string;
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
  title: string;
  author: string;
  item_date: string;
  notes: string;
  price: string;
  type: string;
  sort_order: number;
  created_at: string;
}

function mapItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title ?? "",
    author: row.author ?? "",
    releaseDate: row.item_date,
    notes: row.notes,
    price: row.price ?? "",
    type: row.type ?? "",
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
    listType: row.list_type ?? "book_list",
    color: row.color ?? "plum",
    emoji: row.emoji ?? "Books",
    bulletSymbol: row.bullet_symbol ?? "→",
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
  opts?: { listType?: string; color?: string; emoji?: string; bulletSymbol?: string; description?: string; dateLabel?: string; notesLabel?: string }
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
  patch: { title?: string; description?: string; color?: string; emoji?: string; bulletSymbol?: string; dateLabel?: string; notesLabel?: string }
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
  fields: { title: string; author?: string; releaseDate?: string; notes?: string; price?: string; type?: string }
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
  patch: { releaseDate?: string; notes?: string; price?: string; type?: string }
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
