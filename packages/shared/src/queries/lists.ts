import type { BookList, ListItem } from "../types";

/**
 * Row shapes returned by the lists API (snake_case from Supabase) plus the
 * mappers to the camelCase `BookList` / `ListItem` domain types. Both the
 * web and mobile `lib/lists.ts` wrappers share these — only the HTTP layer
 * (which `apiFetch` to call) differs between platforms.
 */

export interface ListItemRow {
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
  book_id: string | null;
  user_books?: {
    title_override: string | null;
    cover_url_override?: string | null;
    catalog_books: { title: string; cover_url: string } | null;
  } | null;
}

export interface ListRow {
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

export function mapListItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    listId: row.list_id,
    title:
      row.user_books?.title_override ??
      row.user_books?.catalog_books?.title ??
      row.title ??
      "",
    author: row.author ?? "",
    releaseDate: row.item_date,
    notes: row.notes,
    price: row.price ?? "",
    type: row.type ?? "",
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    bookId: row.book_id ?? undefined,
    coverUrl:
      row.user_books?.cover_url_override ??
      row.user_books?.catalog_books?.cover_url ??
      undefined,
  };
}

export function mapList(row: ListRow): BookList {
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
      .map(mapListItem)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    bookmarked: row.bookmarked ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
