"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { toast } from "@/lib/toast";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import type { BookEntry } from "@/types";
import {
  isReread,
  ratingTrend,
  readCount,
  readTimeline,
  rereadInsight,
} from "@spine/shared";
import { StarDisplay } from "@/components/StarDisplay";
import { RereadsSkeleton } from "@/components/skeletons/RereadsSkeleton";

// ─── Filter types ────────────────────────────────────────────────────────────

type Filter = "all" | "2x" | "3x+" | "improved" | "dropped";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RereadsPage() {
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    getEntries({ include: "nested" })
      .then((all) =>
        // Must have at least one historical read that finished (not DNF, has a date)
        setEntries(all.filter(isReread)),
      )
      .catch(() => toast("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter((b) => {
    const count = readCount(b);
    const trend = ratingTrend(readTimeline(b));
    if (filter === "2x") return count === 2;
    if (filter === "3x+") return count >= 3;
    if (filter === "improved") return trend === "up";
    if (filter === "dropped") return trend === "down";
    return true;
  });

  const insight = rereadInsight(entries);

  if (loading) return <RereadsSkeleton />;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/library" className="back-link">
            ← library
          </Link>
        </div>

        <div className="flex items-baseline justify-between mb-1">
          <h1 className="page-title">re-reads</h1>
          {entries.length > 0 && (
            <span className="text-xs text-fg-faint">
              {entries.length} {entries.length === 1 ? "book" : "books"}
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <p className="font-hand text-body-md text-terra mb-8">
            {"books you've returned to · each one a different conversation"}
          </p>
        )}

        {/* Filters */}
        {entries.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {(["all", "2x", "3x+", "improved", "dropped"] as Filter[]).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filter === f
                      ? "bg-plum text-white border-plum"
                      : "bg-transparent text-fg-muted border-line hover:border-fg-faint"
                  }`}
                >
                  {f === "all"
                    ? "all"
                    : f === "2x"
                      ? "↺ 2×"
                      : f === "3x+"
                        ? "↺ 3×+"
                        : f === "improved"
                          ? "rating ↑"
                          : "rating ↓"}
                </button>
              ),
            )}
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 && entries.length === 0 ? (
          <EmptyState message="No re-reads yet. Start a re-read from any finished book's reflection tab." />
        ) : filtered.length === 0 ? (
          <EmptyState message="No books match this filter." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-7 mb-10">
            {filtered.map((book) => {
              const count = readCount(book);
              const timeline = readTimeline(book);
              const trend = ratingTrend(timeline);
              const isGold = count >= 3;

              return (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="group block"
                >
                  {/* Cover with badge */}
                  <div className="relative mb-2">
                    <BookCover
                      coverUrl={book.coverUrl}
                      title={book.title}
                      author={book.author}
                      className="w-full"
                    />
                    {/* Re-read badge */}
                    <div
                      className={`absolute top-1.5 right-1.5 text-label font-bold px-1.5 py-0.5 rounded-full leading-none ${
                        isGold
                          ? "bg-gold text-fg-heading"
                          : "bg-plum text-white"
                      }`}
                    >
                      ↺ {count}×
                    </div>
                  </div>

                  {/* Title + author */}
                  <p className="text-sm font-medium leading-snug truncate text-fg group-hover:opacity-70 transition-opacity">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-detail text-fg-faint truncate mt-0.5">
                      {book.author}
                    </p>
                  )}

                  {/* Rating evolution */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                    {timeline.map((r, i) => {
                      const isLast = i === timeline.length - 1;
                      return (
                        <span key={i} className="flex items-center gap-1">
                          <span
                            className={`font-hand text-caption leading-none ${
                              isLast && isGold
                                ? "text-gold"
                                : isLast && trend === "up"
                                  ? "text-sage"
                                  : isLast && trend === "down"
                                    ? "text-terra"
                                    : "text-fg-muted"
                            }`}
                          >
                            {r.rating > 0 ? (
                              <StarDisplay rating={r.rating} size={10} />
                            ) : r.status === "reading" ? (
                              "in progress"
                            ) : (
                              "—"
                            )}
                          </span>
                          {!isLast && (
                            <span className="text-label text-fg-muted">→</span>
                          )}
                        </span>
                      );
                    })}
                    {trend === "up" && (
                      <span className="text-detail text-sage">↑</span>
                    )}
                    {trend === "down" && (
                      <span className="text-detail text-terra">↓</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Insight callout */}
        {insight && entries.length >= 2 && (
          <div className="flex gap-4 items-start rounded-xl border-l-[3px] border-l-lavender bg-[rgba(196,181,212,0.08)] px-5 py-4 mt-4">
            <span className="text-lg shrink-0 text-lavender">✦</span>
            <div>
              <p className="font-hand text-note text-lavender mb-1">
                a pattern in your re-reads
              </p>
              <p className="font-serif text-note italic leading-relaxed text-fg">
                {insight}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
