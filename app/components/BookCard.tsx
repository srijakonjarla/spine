"use client";

import Link from "next/link";
import type { BookEntry } from "../types";

const statusSymbol: Record<BookEntry["status"], string> = {
  reading: "○",
  finished: "●",
  "want-to-read": "◌",
  "did-not-finish": "×",
};

const statusColor: Record<BookEntry["status"], string> = {
  reading: "text-emerald-600",
  finished: "text-stone-400",
  "want-to-read": "text-amber-500",
  "did-not-finish": "text-red-400",
};

export default function BookCard({ entry }: { entry: BookEntry }) {
  return (
    <Link href={`/book/${entry.id}`} className="block group font-mono">
      <div className="row-item">
        <span className={`text-xs shrink-0 ${statusColor[entry.status]}`}>
          {statusSymbol[entry.status]}
        </span>
        <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">
          {entry.title || "untitled"}
        </span>
        {entry.author && (
          <span className="text-xs text-stone-400 truncate shrink-0">{entry.author}</span>
        )}
        <span className="dot-leader" />
        {entry.rating > 0 && (
          <span className="text-xs text-amber-400 shrink-0">{"★".repeat(entry.rating)}</span>
        )}
      </div>
    </Link>
  );
}
