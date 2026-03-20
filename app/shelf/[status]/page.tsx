"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { STATUS_LABEL, STATUS_SYMBOL, STATUS_COLOR } from "@/lib/statusMeta";
import type { BookEntry } from "@/types";

const VALID_STATUSES = new Set(["reading", "finished", "want-to-read", "did-not-finish"]);

export default function StatusCatalogPage() {
  const { status } = useParams<{ status: string }>();
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  if (!VALID_STATUSES.has(status)) notFound();

  useEffect(() => {
    getEntries()
      .then((all) => setEntries(all.filter((e) => e.status === status)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.author.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/shelf" className="back-link">← shelf</Link>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-xs ${STATUS_COLOR[status]}`}>{STATUS_SYMBOL[status]}</span>
          <h1 className="page-title">{STATUS_LABEL[status]}</h1>
        </div>
        <p className="text-xs text-stone-400 mb-8">{entries.length} books</p>

        <div className="mb-10">
          <input
            id="status-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by title or author..."
            className="underline-input"
            disabled={loading}
          />
        </div>

        {loading && (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-baseline">
                <div className="h-3 bg-stone-100 rounded" style={{ width: `${40 + Math.random() * 40}%` }} />
                <div className="flex-1 border-b border-dotted border-stone-100" />
                <div className="h-3 w-16 bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-xs text-stone-300">no books found.</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-0.5">
            {filtered.map((e) => (
              <Link key={e.id} href={`/book/${e.id}`} className="row-item group font-mono">
                <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">{e.title || "untitled"}</span>
                {e.author && <span className="text-xs text-stone-400 shrink-0">{e.author}</span>}
                <span className="dot-leader" />
                {e.rating > 0 && <span className="text-xs text-amber-900 shrink-0">{"★".repeat(e.rating)}</span>}
                {e.bookmarked && <span className="text-xs text-stone-400 shrink-0">⌖</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
