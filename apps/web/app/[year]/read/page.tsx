"use client";

import { useState } from "react";
import Link from "next/link";
import { useYear } from "@/providers/YearContext";
import { BookCover } from "@/components/BookCover";
import { StarDisplay } from "@/components/StarDisplay";
import { formatDate } from "@/lib/dates";
import { MONTH_NAMES } from "@/lib/constants";
import { YearReadSkeleton } from "@/components/skeletons/YearReadSkeleton";

function monthIndex(iso: string): number {
  return parseInt(iso.slice(5, 7), 10) - 1;
}

export default function ReadThisYearPage() {
  const { year, loading, finishedBooks } = useYear();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Group by month
  const byMonth = new Map<number, typeof finishedBooks>();
  finishedBooks.forEach((b) => {
    const m = b.dateFinished ? monthIndex(b.dateFinished) : -1;
    if (m < 0) return;
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(b);
  });
  const months = Array.from(byMonth.keys()).sort((a, b) => a - b);

  if (loading) return <YearReadSkeleton />;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href={`/${year}`} className="back-link">
            ← {year}
          </Link>
        </div>

        <div className="mb-10 pb-8 border-b border-line">
          <p className="text-xs text-fg-faint mb-2 tracking-widest uppercase">
            {year} · finished
          </p>
          <h1 className="font-serif text-3xl font-semibold text-fg-heading tracking-tight">
            books i read
          </h1>
          {finishedBooks.length > 0 && (
            <p className="text-xs text-fg-muted mt-3">
              {finishedBooks.length}{" "}
              {finishedBooks.length === 1 ? "book" : "books"}
            </p>
          )}
        </div>

        {finishedBooks.length === 0 ? (
          <p className="text-xs text-fg-faint">
            no finished books logged for {year} yet.
          </p>
        ) : (
          <div className="space-y-14">
            {months.map((m) => {
              const monthBooks = byMonth.get(m)!;
              return (
                <section key={m}>
                  <div className="flex items-baseline gap-3 mb-5">
                    <h2 className="text-sm font-semibold tracking-wider uppercase text-fg-muted">
                      {MONTH_NAMES[m]}
                    </h2>
                    <span className="flex-1 border-b border-dotted border-line mb-0.5" />
                    <span className="text-xs text-fg-faint">
                      {monthBooks.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
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
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-40 rounded-lg p-2.5 shadow-lg pointer-events-none bg-surface border border-line">
                            <p className="text-caption font-semibold leading-snug mb-0.5 text-fg-heading line-clamp-2">
                              {b.title}
                            </p>
                            {b.author && (
                              <p className="text-detail truncate text-fg-muted mb-1">
                                {b.author}
                              </p>
                            )}
                            {b.rating > 0 && (
                              <StarDisplay rating={b.rating} size={10} />
                            )}
                            {b.dateFinished && (
                              <p className="text-label mt-1 text-fg-faint">
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
