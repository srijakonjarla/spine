"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { BookCover } from "@/components/BookCover";
import { StarDisplay } from "@/components/StarDisplay";
import type { BookEntry } from "@/types";
import { formatDate } from "@/lib/dates";
import { MONTH_NAMES } from "@/lib/constants";
import { toast } from "@/lib/toast";

function monthIndex(iso: string): number {
  return parseInt(iso.slice(5, 7), 10) - 1;
}

export default function ReadThisYearPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [books, setBooks] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    getEntries({ year })
      .then((entries) => {
        const finished = entries
          .filter(
            (e) =>
              e.status === "finished" &&
              e.dateFinished?.startsWith(`${year}`),
          )
          .sort((a, b) =>
            (a.dateFinished ?? "").localeCompare(b.dateFinished ?? ""),
          );
        setBooks(finished);
      })
      .catch(() => toast("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, [year]);

  // Group by month
  const byMonth = new Map<number, BookEntry[]>();
  books.forEach((b) => {
    const m = b.dateFinished ? monthIndex(b.dateFinished) : -1;
    if (m < 0) return;
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(b);
  });
  const months = Array.from(byMonth.keys()).sort((a, b) => a - b);

  if (loading)
    return (
      <div className="page">
        <div className="page-content animate-pulse">
          <div className="h-4 w-28 bg-[var(--bg-hover)] rounded mb-8" />
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-[var(--bg-hover)] rounded" />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href={`/${year}`} className="back-link">
            ← {year}
          </Link>
        </div>

        <div className="mb-10 pb-8 border-b border-[var(--border-light)]">
          <p className="text-xs text-[var(--fg-faint)] mb-2 tracking-widest uppercase">
            {year} · finished
          </p>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[var(--fg-heading)] tracking-tight">
            books i read
          </h1>
          {books.length > 0 && (
            <p className="text-xs text-[var(--fg-muted)] mt-3">
              {books.length} {books.length === 1 ? "book" : "books"}
            </p>
          )}
        </div>

        {books.length === 0 ? (
          <p className="text-xs text-[var(--fg-faint)]">
            no finished books logged for {year} yet.
          </p>
        ) : (
          <div className="space-y-14">
            {months.map((m) => {
              const monthBooks = byMonth.get(m)!;
              return (
                <section key={m}>
                  <div className="flex items-baseline gap-3 mb-5">
                    <h2 className="text-sm font-semibold tracking-wider uppercase text-[var(--fg-muted)]">
                      {MONTH_NAMES[m]}
                    </h2>
                    <span className="flex-1 border-b border-dotted border-[var(--border-light)] mb-0.5" />
                    <span className="text-xs text-[var(--fg-faint)]">
                      {monthBooks.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                    {monthBooks.map((b) => (
                      <Link
                        key={b.id}
                        href={`/book/${b.id}`}
                        className="group relative"
                        onMouseEnter={() => setHoveredId(b.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <BookCover
                          coverUrl={b.coverUrl}
                          title={b.title}
                          author={b.author}
                          className="w-full"
                        />
                        {/* Tooltip */}
                        {hoveredId === b.id && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-40 rounded-lg p-2.5 shadow-lg pointer-events-none bg-[var(--bg-surface)] border border-[var(--border-light)]">
                            <p className="text-[11px] font-semibold leading-snug mb-0.5 text-[var(--fg-heading)] line-clamp-2">
                              {b.title}
                            </p>
                            {b.author && (
                              <p className="text-[10px] truncate text-[var(--fg-muted)] mb-1">
                                {b.author}
                              </p>
                            )}
                            {b.rating > 0 && (
                              <StarDisplay rating={b.rating} size={10} />
                            )}
                            {b.dateFinished && (
                              <p className="text-[9px] mt-1 text-[var(--fg-faint)]">
                                {formatDate(b.dateFinished, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
