import Link from "next/link";
import type { BookList } from "../types";

interface BookmarkSectionProps {
  books: { id: string; title: string }[];
  lists: BookList[];
  year: number;
}

export function BookmarkSection({ books, lists, year }: BookmarkSectionProps) {
  const bookmarkedLists = lists.filter((l) => l.bookmarked);
  if (!books.length && !bookmarkedLists.length) return null;

  return (
    <div className="mb-12">
      <p className="section-label mb-3">bookmarks</p>
      <div className="space-y-1">
        {books.map((b) => (
          <Link key={b.id} href={`/book/${b.id}`} className="row-item group">
            <span className="text-xs text-stone-400">⌖</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">{b.title}</span>
          </Link>
        ))}
        {bookmarkedLists.map((list) => (
          <Link key={list.id} href={`/${year}/lists/${list.id}`} className="row-item group">
            <span className="text-xs text-stone-400">⌖</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">{list.title}</span>
            <span className="dot-leader" />
            <span className="text-xs text-stone-300">{list.items.length}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
