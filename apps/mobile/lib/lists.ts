import {
  mapList,
  mapListItem,
  type BookList,
  type ListItem,
  type ListItemRow,
  type ListRow,
} from "@spine/shared";
import { apiFetch } from "./api";

// ─── API ─────────────────────────────────────────────────────────
export async function getLists(year: number): Promise<BookList[]> {
  const res = await apiFetch(`/api/lists?year=${year}`);
  const data = (await res.json()) as ListRow[];
  return data.map(mapList).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getList(id: string): Promise<BookList | null> {
  const res = await apiFetch(`/api/lists/${id}`);
  const data = await res.json();
  if (!data) return null;
  return mapList(data as ListRow);
}

export interface CreateListOpts {
  listType?: string;
  color?: string;
  emoji?: string;
  bulletSymbol?: string;
  description?: string;
  dateLabel?: string;
  notesLabel?: string;
}

export async function createList(
  year: number,
  title: string,
  opts?: CreateListOpts,
): Promise<BookList> {
  const res = await apiFetch("/api/lists", {
    method: "POST",
    body: JSON.stringify({ year, title, ...opts }),
  });
  return mapList((await res.json()) as ListRow);
}

export async function updateList(
  id: string,
  patch: {
    title?: string;
    description?: string;
    color?: string;
    emoji?: string;
    bulletSymbol?: string;
    dateLabel?: string;
    notesLabel?: string;
    bookmarked?: boolean;
  },
): Promise<void> {
  await apiFetch(`/api/lists/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteList(id: string): Promise<void> {
  await apiFetch(`/api/lists/${id}`, { method: "DELETE" });
}

export async function addListItem(
  listId: string,
  fields: {
    bookId?: string;
    title: string;
    author?: string;
    releaseDate?: string;
    notes?: string;
    price?: string;
    type?: string;
  },
): Promise<ListItem> {
  const res = await apiFetch(`/api/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify(fields),
  });
  return mapListItem((await res.json()) as ListItemRow);
}

export async function updateListItem(
  id: string,
  patch: {
    releaseDate?: string;
    notes?: string;
    price?: string;
    type?: string;
  },
): Promise<void> {
  await apiFetch(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function removeListItem(
  id: string,
  listId: string,
): Promise<void> {
  await apiFetch(`/api/lists/${listId}/items/${id}`, { method: "DELETE" });
}

export async function reorderListItems(
  listId: string,
  orderedIds: string[],
): Promise<void> {
  await apiFetch(`/api/lists/${listId}/items/reorder`, {
    method: "POST",
    body: JSON.stringify({ orderedIds }),
  });
}

export type { BookList, ListItem };
