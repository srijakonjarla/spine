"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useYear } from "@/providers/YearContext";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/dates";
import type { BookEntry } from "@/types";
import {
  countBy,
  countTags,
  fmtHours,
  fmtPages,
  uniqueById,
  MonthlyChart,
  RatingsAndFormats,
  MissingDataCard,
  BarSection,
  GenreSection,
  ShortestLongestSection,
  BookListSection,
  RereadsSection,
} from "@/components/review";

export default function YearReviewPage() {
  const { year, loading, yearEntries, finishedBooks, loggedDates, lists } =
    useYear();

  const libraryBookIds = useMemo(() => {
    const ids = new Set<string>();
    for (const list of lists) {
      if (list.listType !== "library_loan") continue;
      for (const item of list.items) {
        if (item.bookId) ids.add(item.bookId);
      }
    }
    return ids;
  }, [lists]);

  const acquisitionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of lists) {
      if (list.listType !== "book_ledger") continue;
      for (const item of list.items) {
        if (item.bookId && item.type === "bought" && item.notes)
          map.set(item.bookId, item.notes);
      }
    }
    return map;
  }, [lists]);

  const isAudio = (b: BookEntry) => b.format === "audiobook";
  const printBooks = finishedBooks.filter((b) => !isAudio(b));
  const audioBooks = finishedBooks.filter(isAudio);

  const totalPages = printBooks.reduce((s, b) => s + (b.pageCount ?? 0), 0);
  const totalAudioMinutes = audioBooks.reduce(
    (s, b) => s + (b.audioDurationMinutes ?? 0),
    0,
  );

  const printMissingPages = uniqueById(printBooks.filter((b) => !b.pageCount));
  const audioMissingHours = uniqueById(audioBooks.filter((b) => !b.audioDurationMinutes));

  const libraryFinished = finishedBooks.filter((b) => libraryBookIds.has(b.id));
  const rereads = finishedBooks.filter((b) => b.reads.length > 0);
  const uniqueRereads = uniqueById(rereads);
  const dnfs = yearEntries.filter((b) => b.status === "did-not-finish");

  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const b of finishedBooks) {
    if (b.rating >= 1 && b.rating <= 5)
      ratingDist[b.rating] = (ratingDist[b.rating] ?? 0) + 1;
  }
  const maxRatingCount = Math.max(...Object.values(ratingDist), 1);
  const avgRating = (() => {
    const rated = finishedBooks.filter((b) => b.rating > 0);
    if (!rated.length) return 0;
    return rated.reduce((s, b) => s + b.rating, 0) / rated.length;
  })();

  const monthlyFinished: Record<string, number> = {};
  for (const b of finishedBooks) {
    if (b.dateFinished) {
      const m = b.dateFinished.slice(0, 7);
      monthlyFinished[m] = (monthlyFinished[m] ?? 0) + 1;
    }
  }
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return {
      key,
      label: formatDate(`${key}-01`, { month: "short" }),
      count: monthlyFinished[key] ?? 0,
    };
  });
  const maxMonthly = Math.max(...months.map((m) => m.count), 1);

  const genreCounts = countTags(finishedBooks, (b) => b.genres);
  const formatCounts = countBy(finishedBooks.filter((b) => b.format), (b) => b.format);
  const publisherCounts = countBy(
    uniqueById(finishedBooks).filter((b) => b.publisher),
    (b) => b.publisher,
  ).slice(0, 10);
  const acquiredCounts = countBy(
    finishedBooks.flatMap((b) => {
      const src = acquisitionMap.get(b.id);
      return src ? [src] : [];
    }),
    (s) => s,
  );
  const diversityCounts = countTags(uniqueById(finishedBooks), (b) => b.diversityTags);

  const withPages = uniqueById(printBooks.filter((b) => (b.pageCount ?? 0) > 0))
    .sort((a, b) => (a.pageCount ?? 0) - (b.pageCount ?? 0));
  const withAudio = uniqueById(audioBooks.filter((b) => (b.audioDurationMinutes ?? 0) > 0))
    .sort((a, b) => (a.audioDurationMinutes ?? 0) - (b.audioDurationMinutes ?? 0));

  const hasData = finishedBooks.length > 0;

  if (loading)
    return (
      <div className="page animate-pulse">
        <div className="px-6 pt-16 pb-12 mb-10 bg-plum">
          <div className="max-w-3xl mx-auto">
            <div className="h-3 w-16 bg-white/20 rounded mb-6" />
            <div className="h-10 w-40 bg-white/20 rounded mb-3" />
            <div className="h-3 w-36 bg-white/20 rounded" />
          </div>
        </div>
        <div className="page-content">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[var(--bg-hover)] rounded-xl" />
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
            href={`/${year}`}
            className="text-xs text-white/50 hover:text-white/80 transition-colors block mb-6"
          >
            ← {year}
          </Link>
          <p className="text-white/60 text-[11px] mb-1 tracking-widest uppercase">
            year in review
          </p>
          <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-bold italic text-white tracking-tight">
            {year}
          </h1>
          {hasData && (
            <p className="text-white/70 text-sm mt-3">
              {finishedBooks.length}{" "}
              {finishedBooks.length === 1 ? "book" : "books"} finished
              {totalPages > 0 && ` · ${fmtPages(totalPages)} pages`}
              {totalAudioMinutes > 0 && ` · ${fmtHours(totalAudioMinutes)} listened`}
              {loggedDates.size > 0 && ` · ${loggedDates.size} days read`}
            </p>
          )}
        </div>
      </div>

      <div className="page-content">
        {!hasData ? (
          <p className="text-sm text-[var(--fg-faint)] text-center py-16">
            No finished books for {year} yet.
          </p>
        ) : (
          <>
            {/* Big numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-14">
              <StatCard label="books finished" value={finishedBooks.length} accentClass="border-t-[var(--stat-border-books)]" />
              <StatCard label="pages read" value={totalPages > 0 ? fmtPages(totalPages) : "—"} accentClass="border-t-[var(--stat-border-days)]" />
              <StatCard label="hours listened" value={totalAudioMinutes > 0 ? fmtHours(totalAudioMinutes) : "—"} accentClass="border-t-[var(--stat-border-rating)]" />
              <StatCard label="days read" value={loggedDates.size} accentClass="border-t-[var(--stat-border-quotes)]" />
              <StatCard label="re-reads" value={rereads.length} accentClass="border-t-[var(--stat-border-books)]" />
              <StatCard label="library checkouts" value={libraryFinished.length} accentClass="border-t-[var(--stat-border-days)]" />
              <StatCard label="did not finish" value={dnfs.length} accentClass="border-t-[var(--stat-border-rating)]" />
              <StatCard label="avg rating" value={avgRating > 0 ? `${avgRating.toFixed(1)}★` : "—"} accentClass="border-t-[var(--stat-border-quotes)]" />
            </div>

            <MissingDataCard printMissingPages={printMissingPages} audioMissingHours={audioMissingHours} />
            <MonthlyChart months={months} maxMonthly={maxMonthly} />
            <RatingsAndFormats ratingDist={ratingDist} maxRatingCount={maxRatingCount} dnfs={dnfs} formatCounts={formatCounts} />
            <GenreSection items={genreCounts} />
            <BarSection label="by diversity" items={diversityCounts} color="plum" />
            <BarSection label="by publisher" items={publisherCounts} color="sage" />
            <BarSection label="where books came from" items={acquiredCounts} color="terra" />
            <ShortestLongestSection
              shortestPrint={withPages[0] ?? null}
              longestPrint={withPages[withPages.length - 1] ?? null}
              shortestAudio={withAudio[0] ?? null}
              longestAudio={withAudio[withAudio.length - 1] ?? null}
            />
            <RereadsSection rereads={rereads} uniqueRereads={uniqueRereads} />
            <BookListSection
              label={`library checkouts · ${libraryFinished.length}`}
              books={uniqueById(libraryFinished)}
              getMeta={(b) => b.format || undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
