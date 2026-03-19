"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getEntries } from "../lib/db";
import { STATUS_ORDER, STATUS_LABEL, STATUS_SYMBOL, STATUS_COLOR, TRUNCATED_STATUSES, TRUNCATE_LIMIT } from "../lib/statusMeta";
import type { BookEntry } from "../types";

export default function ShelfPage() {
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getEntries()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.author.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const grouped = STATUS_ORDER.reduce<Record<string, BookEntry[]>>((acc, status) => {
    acc[status] = filtered.filter((e) => e.status === status);
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/" className="back-link">← index</Link>
        </div>

        <h1 className="page-title mb-1">shelf</h1>
        <p className="text-xs text-stone-400 mb-8">{entries.length} books total</p>

        {/* search */}
        <div className="mb-10">
          <input
            id="shelf-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by title or author..."
            className="underline-input"
            disabled={loading}
          />
        </div>

        {/* loading skeleton */}
        {loading && (
          <div className="space-y-8 animate-pulse">
            {[14, 8, 6].map((count, i) => (
              <div key={i}>
                <div className="h-3 w-32 bg-stone-200 rounded mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: count }).map((_, j) => (
                    <div key={j} className="flex gap-3 items-baseline">
                      <div className="h-3 bg-stone-100 rounded" style={{ width: `${40 + Math.random() * 40}%` }} />
                      <div className="flex-1 border-b border-dotted border-stone-100" />
                      <div className="h-3 w-16 bg-stone-100 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* grouped by status */}
        {!loading && (
          <div className="space-y-10">
            {STATUS_ORDER.map((status) => {
              const books = grouped[status];
              if (!books.length) return null;
              const truncate = TRUNCATED_STATUSES.has(status) && !search.trim();
              const visible = truncate ? books.slice(0, TRUNCATE_LIMIT) : books;
              const hidden = truncate ? books.length - TRUNCATE_LIMIT : 0;

              return (
                <section key={status}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-xs ${STATUS_COLOR[status]}`}>{STATUS_SYMBOL[status]}</span>
                    <p className="section-label">{STATUS_LABEL[status]}</p>
                    <span className="text-xs text-stone-300 ml-1">{books.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {visible.map((e) => (
                      <Link key={e.id} href={`/book/${e.id}`} className="row-item group font-mono">
                        <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">{e.title || "untitled"}</span>
                        {e.author && <span className="text-xs text-stone-400 shrink-0">{e.author}</span>}
                        <span className="dot-leader" />
                        {e.rating > 0 && <span className="text-xs text-amber-400 shrink-0">{"★".repeat(e.rating)}</span>}
                        {e.bookmarked && <span className="text-xs text-stone-400 shrink-0">⌖</span>}
                      </Link>
                    ))}
                  </div>
                  {hidden > 0 && (
                    <Link
                      href={`/shelf/${status}`}
                      className="mt-3 inline-block text-xs text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      see {hidden} more →
                    </Link>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
