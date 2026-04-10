"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog } from "@/lib/habits";
import { getQuotes } from "@/lib/quotes";
import type { BookEntry } from "@/types";

const MOOD_COLORS: Record<string, string> = {
  cozy: "#C97B5A",
  dark: "#374151",
  hopeful: "#7B9E87",
  funny: "#D4A843",
  "slow-burn": "#C4B5D4",
  "heart-wrenching": "#BE185D",
  whimsical: "#8B5CF6",
  "thought-provoking": "#2D1B2E",
  escapist: "#1565C0",
};

export default function StatsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [books, setBooks] = useState<BookEntry[]>([]);
  const [daysRead, setDaysRead] = useState(0);
  const [quoteCount, setQuoteCount] = useState(0);

  useEffect(() => {
    Promise.all([getEntries({ year }), getReadingLog(year), getQuotes()]).then(([b, log, qs]) => {
      setBooks(b);
      setDaysRead(log.length);
      setQuoteCount(qs.filter((q) => q.createdAt.startsWith(`${year}`)).length);
    }).catch(console.error);
  }, [year]);

  const finished = books.filter((b) => b.status === "finished");
  const rated = finished.filter((b) => b.rating > 0);
  const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0;

  // Genre breakdown
  const genreCounts: Record<string, number> = {};
  books.forEach((b) => b.genres.forEach((g) => { genreCounts[g] = (genreCounts[g] ?? 0) + 1; }));
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxGenreCount = topGenres[0]?.[1] ?? 1;

  // Mood breakdown
  const moodCounts: Record<string, number> = {};
  books.forEach((b) => b.moodTags.forEach((m) => { moodCounts[m] = (moodCounts[m] ?? 0) + 1; }));
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
    return { key, label: new Date(year, i).toLocaleDateString("en-US", { month: "short" }), count: monthlyFinished[key] ?? 0 };
  });
  const maxMonthly = Math.max(...months.map((m) => m.count), 1);

  // Top rated books
  const topBooks = [...finished].filter((b) => b.rating >= 4).sort((a, b) => b.rating - a.rating).slice(0, 6);

  return (
    <div className="page">
      {/* Hero */}
      <div className="px-6 pt-16 pb-12 mb-10" style={{ background: "linear-gradient(160deg, var(--plum-dark), var(--plum))" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <Link href="/" className="text-xs text-white/50 hover:text-white/80 transition-colors block mb-6">← home</Link>
          <p className="text-white/60 text-sm mb-1">your year in reading</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-bold italic text-white tracking-tight">{year}</h1>
          {finished.length > 0 && (
            <p className="text-white/70 text-sm mt-3">
              {finished.length} {finished.length === 1 ? "book" : "books"} finished
              {daysRead > 0 && ` · ${daysRead} days read`}
            </p>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Big stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { label: "books read", value: finished.length, accent: "#C97B5A" },
            { label: "days reading", value: daysRead, accent: "#7B9E87" },
            { label: "avg rating", value: avgRating > 0 ? avgRating.toFixed(1) : "—", accent: "#C4B5D4" },
            { label: "quotes saved", value: quoteCount, accent: "#D4A843" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderTop: `3px solid ${accent}` }}>
              <p className="text-2xl font-bold" style={{ color: "var(--fg-heading)" }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--fg-faint)" }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Reading pace */}
          <div>
            <p className="section-label mb-6">books per month</p>
            <div className="flex items-end gap-1.5 h-28">
              {months.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: m.count > 0 ? `${(m.count / maxMonthly) * 100}%` : "2px",
                      background: m.count > 0 ? "linear-gradient(to top, #7B9E87, #C97B5A)" : "var(--border-light)",
                      minHeight: 2,
                    }}
                  />
                  <span className="text-[9px]" style={{ color: "var(--fg-faint)" }}>{m.label}</span>
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
                      <span className="text-xs" style={{ color: "var(--fg)" }}>{genre}</span>
                      <span className="text-xs" style={{ color: "var(--fg-faint)" }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / maxGenreCount) * 100}%`, background: "linear-gradient(to right, var(--plum), var(--terra))" }} />
                    </div>
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
                const color = MOOD_COLORS[mood] ?? "#2D1B2E";
                const size = Math.max(11, Math.min(16, 11 + count * 1.5));
                return (
                  <span key={mood} className="px-3 py-1.5 rounded-full" style={{ fontSize: size, background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {mood} <span className="opacity-60 text-[10px]">{count}</span>
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
                <Link key={b.id} href={`/book/${b.id}`} className="flex items-baseline gap-3 py-1.5 group">
                  <p className="text-sm font-medium flex-1 truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>{b.title}</p>
                  {b.author && <p className="text-xs shrink-0 hidden sm:block truncate" style={{ color: "var(--fg-faint)" }}>{b.author}</p>}
                  {b.rating > 0 && <p className="text-[11px] shrink-0" style={{ color: "#D4A843" }}>{"★".repeat(Math.round(b.rating))}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {finished.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "var(--fg-faint)" }}>no books finished in {year} yet</p>
            <Link href={`/${year}/books`} className="back-link mt-3 block">log a book →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
