"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog } from "@/lib/habits";
import { getQuotes } from "@/lib/quotes";
import { StarIcon } from "@phosphor-icons/react";
import type { BookEntry } from "@/types";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/dates";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";

export default function StatsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [books, setBooks] = useState<BookEntry[]>([]);
  const [daysRead, setDaysRead] = useState(0);
  const [quoteCount, setQuoteCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEntries({ year }), getReadingLog(year), getQuotes()])
      .then(([b, log, qs]) => {
        setBooks(b);
        setDaysRead(log.length);
        setQuoteCount(
          qs.filter((q) => q.createdAt.startsWith(`${year}`)).length,
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const finished = books.filter((b) => b.status === "finished");
  const rated = finished.filter((b) => b.rating > 0);
  const avgRating =
    rated.length > 0
      ? rated.reduce((s, b) => s + b.rating, 0) / rated.length
      : 0;

  // Genre breakdown
  const genreCounts: Record<string, number> = {};
  books.forEach((b) =>
    b.genres.forEach((g) => {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    }),
  );
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxGenreCount = topGenres[0]?.[1] ?? 1;

  // Mood breakdown
  const moodCounts: Record<string, number> = {};
  books.forEach((b) =>
    b.moodTags.forEach((m) => {
      moodCounts[m] = (moodCounts[m] ?? 0) + 1;
    }),
  );
  const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

  // Monthly reading pace
  const monthlyFinished: Record<string, number> = {};
  finished.forEach((b) => {
    if (b.dateFinished) {
      const m = b.dateFinished.slice(0, 7);
      monthlyFinished[m] = (monthlyFinished[m] ?? 0) + 1;
    }
  });
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return {
      key,
      label: formatDate(`${key}-01`, { month: "short" }),
      count: monthlyFinished[key] ?? 0,
    };
  });
  const maxMonthly = Math.max(...months.map((m) => m.count), 1);

  const topBooks = [...finished]
    .filter((b) => b.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  if (loading)
    return (
      <div className="page animate-pulse">
        <div className="px-6 pt-16 pb-12 mb-10 bg-plum">
          <div className="max-w-3xl mx-auto">
            <div className="h-3 w-16 bg-white/20 rounded mb-6" />
            <div className="h-10 w-20 bg-white/20 rounded mb-3" />
            <div className="h-3 w-36 bg-white/20 rounded" />
          </div>
        </div>
        <div className="page-content">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[var(--bg-hover)] rounded-xl" />
            ))}
          </div>
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-[var(--bg-hover)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="page">
      {/* Hero */}
      <div className="px-6 pt-16 pb-12 mb-10 bg-[linear-gradient(160deg,var(--plum-dark),var(--plum))]">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-xs text-white/50 hover:text-white/80 transition-colors block mb-6"
          >
            ← home
          </Link>
          <p className="text-white/60 text-sm mb-1">your year in reading</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-bold italic text-white tracking-tight">
            {year}
          </h1>
          {finished.length > 0 && (
            <p className="text-white/70 text-sm mt-3">
              {finished.length} {finished.length === 1 ? "book" : "books"}{" "}
              finished
              {daysRead > 0 && ` · ${daysRead} days read`}
            </p>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Big stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            {
              label: "books read",
              value: finished.length,
              accentClass: "border-t-[var(--stat-border-books)]",
            },
            {
              label: "days reading",
              value: daysRead,
              accentClass: "border-t-[var(--stat-border-days)]",
            },
            {
              label: "avg rating",
              value: avgRating > 0 ? avgRating.toFixed(1) : "—",
              accentClass: "border-t-[var(--stat-border-rating)]",
            },
            {
              label: "quotes saved",
              value: quoteCount,
              accentClass: "border-t-[var(--stat-border-quotes)]",
            },
          ].map(({ label, value, accentClass }) => (
            <StatCard
              key={label}
              label={label}
              value={value}
              accentClass={accentClass}
            />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Reading pace */}
          <div>
            <p className="section-label mb-6">books per month</p>
            <div className="flex items-end gap-1.5 h-28">
              {months.map((m) => (
                <div
                  key={m.key}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    style={
                      m.count > 0
                        ? {
                            height: `${Math.round((m.count / maxMonthly) * 100)}%`,
                          }
                        : undefined
                    }
                    className={`w-full rounded-t-sm transition-all min-h-[2px] ${
                      m.count > 0
                        ? "[background-image:var(--gradient-chart-month)]"
                        : "bg-[var(--border-light)] h-[2px]"
                    }`}
                  />
                  <span className="text-[9px] text-[var(--fg-faint)]">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Genre breakdown */}
          {topGenres.length > 0 && (
            <div>
              <p className="section-label mb-6">by genre</p>
              <div className="space-y-3">
                {topGenres.map(([genre, count]) => (
                  <div key={genre}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs text-[var(--fg)]">{genre}</span>
                      <span className="text-xs text-[var(--fg-faint)]">
                        {count}
                      </span>
                    </div>
                    <ProgressBar
                      value={count / maxGenreCount}
                      color="gradient"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mood cloud */}
        {topMoods.length > 0 && (
          <div className="mb-12">
            <p className="section-label mb-4">mood cloud</p>
            <div className="flex flex-wrap gap-2">
              {topMoods.map(([mood, count]) => {
                const size = Math.max(11, Math.min(16, 11 + count * 1.5));
                return (
                  <span
                    key={mood}
                    className={`mood-cloud-pill mood-${mood.replace(/\s+/g, "-")}`}
                    style={{ fontSize: size }}
                  >
                    {mood}{" "}
                    <span className="opacity-60 text-[10px]">{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Top books */}
        {topBooks.length > 0 && (
          <div className="mb-12">
            <p className="section-label mb-6">favorites</p>
            <div className="space-y-1">
              {topBooks.map((b) => (
                <Link
                  key={b.id}
                  href={`/book/${b.id}`}
                  className="flex items-baseline gap-3 py-1.5 group"
                >
                  <p className="text-sm font-medium flex-1 truncate group-hover:opacity-70 transition-opacity text-[var(--fg)]">
                    {b.title}
                  </p>
                  {b.author && (
                    <p className="text-xs shrink-0 hidden sm:block truncate text-[var(--fg-faint)]">
                      {b.author}
                    </p>
                  )}
                  {b.rating > 0 && (
                    <span className="flex items-center shrink-0 text-gold">
                      {Array.from({ length: Math.round(b.rating) }, (_, i) => (
                        <StarIcon key={i} size={10} weight="fill" />
                      ))}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {finished.length === 0 && (
          <EmptyState message="No finished books this year yet." />
        )}
      </div>
    </div>
  );
}
