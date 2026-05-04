import Link from "next/link";
import type { BookEntry } from "@/types";

interface BookRowProps {
  book: BookEntry;
  /** Optional right-aligned tail label (e.g. "320 pp", "Mar 12"). */
  meta?: string;
}

/** Single clickable book row used in review sections. */
export function BookRow({ book, meta }: BookRowProps) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="flex items-baseline gap-3 py-1.5 group"
    >
      <p className="text-sm font-medium flex-1 truncate group-hover:opacity-70 transition-opacity text-fg">
        {book.title}
      </p>
      {book.author && (
        <p className="text-xs shrink-0 hidden sm:block truncate text-fg-faint">
          {book.author}
        </p>
      )}
      {meta && <span className="text-xs shrink-0 text-fg-faint">{meta}</span>}
    </Link>
  );
}
