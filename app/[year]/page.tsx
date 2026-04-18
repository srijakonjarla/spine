"use client";

import Link from "next/link";
import { useYear } from "@/providers/YearContext";
import type { BookEntry } from "@/types";
import { localDateStr, dateMonth } from "@/lib/dates";
import { MONTH_ABBRS, MONTH_NAMES } from "@/lib/constants";
import MiniMonthCal from "@/components/calendar/MiniMonthCal";
import { BookCoverThumb } from "@/components/BookCover";

import { hashStr } from "@/lib/spineUtils";

const SPINE_COLOR_CLASSES = [
  "bg-[var(--year-shelf-0)]",
  "bg-[var(--year-shelf-1)]",
  "bg-[var(--year-shelf-2)]",
  "bg-[var(--year-shelf-3)]",
  "bg-[var(--year-shelf-4)]",
  "bg-[var(--year-shelf-5)]",
  "bg-[var(--year-shelf-6)]",
  "bg-[var(--year-shelf-7)]",
  "bg-[var(--year-shelf-8)]",
  "bg-[var(--year-shelf-9)]",
  "bg-[var(--year-shelf-10)]",
  "bg-[var(--year-shelf-11)]",
  "bg-[var(--year-shelf-12)]",
  "bg-[var(--year-shelf-13)]",
  "bg-[var(--year-shelf-14)]",
  "bg-[var(--year-shelf-15)]",
  "bg-[var(--year-shelf-16)]",
  "bg-[var(--year-shelf-17)]",
  "bg-[var(--year-shelf-18)]",
] as const;
function spineColorClass(title: string) {
  return SPINE_COLOR_CLASSES[hashStr(title) % SPINE_COLOR_CLASSES.length];
}
function spineHeightPx(title: string) {
  return 44 + (hashStr(title) % 26);
}

export default function YearPage() {
  const {
    year,
    loading,
    allEntries,
    finishedBooks,
    loggedDates,
    goals,
    lists,
    quoteCount,
  } = useYear();

  const now = new Date();
  const isCurrentYear = year === now.getFullYear();
  const todayStr = localDateStr(now);

  const upNextBooks = allEntries.filter((b: BookEntry) => b.upNext);

  const avgRating = (() => {
    const rated = finishedBooks.filter((b) => b.rating > 0);
    if (!rated.length) return null;
    return (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1);
  })();

  const autoGoal = goals.find((g) => g.isAuto) ?? null;
  const customGoals = goals.filter((g) => !g.isAuto);

  const goalProgress =
    autoGoal && autoGoal.target > 0
      ? Math.min(1, finishedBooks.length / autoGoal.target)
      : null;

  const finishedDates = new Set(finishedBooks.map((b) => b.dateFinished!));

  const booksByMonth: BookEntry[][] = Array.from({ length: 12 }, () => []);
  finishedBooks.forEach((b) => {
    if (b.dateFinished) {
      const m = dateMonth(b.dateFinished) ?? 0;
      booksByMonth[m].push(b);
    }
  });

  const shelfMonths = booksByMonth
    .map((books, i) => ({ monthIndex: i, books }))
    .filter(({ books }) => books.length > 0);

  const statusLabel = isCurrentYear
    ? `in progress · ${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
    : `complete · ${finishedBooks.length} books`;

  if (loading)
    return (
      <div className="page animate-pulse">
        <div className="-mt-6 -mx-6 mb-10 px-8 py-10 lg:px-12 lg:py-14 bg-plum">
          <div className="h-4 w-28 bg-white/20 rounded mb-3" />
          <div className="h-16 w-24 bg-white/20 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-white/20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="page-content">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] bg-[var(--bg-hover)] rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="page">
      {/* Hero */}
      <div className="-mt-6 -mx-6 mb-10 px-8 py-10 lg:px-12 lg:py-14 bg-plum">
        <div className="max-w-3xl mx-auto lg:ml-0">
          <p className="font-[family-name:var(--font-caveat)] text-lg mb-1 text-gold tracking-[0.06em]">
            your reading year
          </p>
          <h1 className="font-[family-name:var(--font-playfair)] font-bold italic leading-none mb-2 text-[clamp(52px,8vw,80px)] text-white">
            {year}
          </h1>
          <p className="text-[13px] mb-8 text-white/45">{statusLabel}</p>

          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              {
                val: finishedBooks.length,
                label: "Books read",
                sub: autoGoal ? `goal: ${autoGoal.target}` : null,
              },
              { val: loggedDates.size, label: "Days read", sub: null },
              {
                val: avgRating ? `${avgRating}★` : "—",
                label: "Avg rating",
                sub: null,
              },
              { val: quoteCount, label: "Quotes saved", sub: null },
            ].map(({ val, label, sub }) => (
              <div key={label}>
                <p className="font-[family-name:var(--font-playfair)] font-bold leading-none mb-1 text-[clamp(22px,4vw,32px)] text-white">
                  {val}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">
                  {label}
                </p>
                {sub && (
                  <p className="text-[10px] mt-0.5 text-white/30">{sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* Goal progress blocks */}
          {(autoGoal || customGoals.length > 0) && (
            <div className="flex flex-wrap gap-3">
              {autoGoal && goalProgress !== null && (
                <Link
                  href={`/${year}/goal`}
                  className="rounded-xl px-4 py-3 min-w-[200px] bg-white/7 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <p className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1 text-gold/70">
                    {autoGoal.name || "reading goal"}
                  </p>
                  <p className="font-[family-name:var(--font-playfair)] text-[15px] font-semibold mb-2 text-white">
                    {finishedBooks.length} of {autoGoal.target} books ·{" "}
                    {Math.round(goalProgress * 100)}%
                  </p>
                  <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                    <div
                      style={{ width: `${Math.round(goalProgress * 100)}%` }}
                      className="h-full rounded-full bg-[linear-gradient(90deg,#7B9E87,#C97B5A)]"
                    />
                  </div>
                </Link>
              )}
              {customGoals.map((g) => {
                const p =
                  g.target > 0 ? Math.min(1, g.bookIds.length / g.target) : 0;
                return (
                  <Link
                    key={g.id}
                    href={`/${year}/goal`}
                    className="rounded-xl px-4 py-3 min-w-[180px] bg-white/7 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1 text-gold/70">
                      {g.name}
                    </p>
                    <p className="font-[family-name:var(--font-playfair)] text-[15px] font-semibold mb-2 text-white">
                      {g.bookIds.length} of {g.target} · {Math.round(p * 100)}%
                    </p>
                    <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                      <div
                        style={{ width: `${Math.round(p * 100)}%` }}
                        className="h-full rounded-full bg-sage"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* 12 mini month calendars */}
        <div className="mb-12">
          <p className="font-[family-name:var(--font-playfair)] text-[17px] italic mb-5 text-[var(--fg-heading)]">
            {year} at a glance
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-3">
            {MONTH_NAMES.map((_, i) => (
              <MiniMonthCal
                key={i}
                year={year}
                monthIndex={i}
                loggedDates={loggedDates}
                finishedDates={finishedDates}
                todayStr={todayStr}
                isCurrentYear={isCurrentYear}
              />
            ))}
          </div>
        </div>

        {/* Up next */}
        {upNextBooks.length > 0 && (
          <div className="mb-12">
            <p className="font-[family-name:var(--font-playfair)] text-[17px] italic mb-5 text-[var(--fg-heading)]">
              up next
            </p>
            <div className="flex gap-3 flex-wrap">
              {upNextBooks.map((b) => (
                <Link
                  key={b.id}
                  href={`/book/${b.id}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 border border-[var(--border-light)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <BookCoverThumb
                    coverUrl={b.coverUrl}
                    title={b.title}
                    author={b.author}
                    width="w-7"
                    height="h-10"
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold leading-tight truncate max-w-[140px] text-[var(--fg-heading)]">
                      {b.title}
                    </p>
                    {b.author && (
                      <p className="text-[10px] mt-0.5 truncate max-w-[140px] text-[var(--fg-muted)]">
                        {b.author}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bookshelf */}
        {shelfMonths.length > 0 && (
          <div className="mb-12">
            <div className="flex items-baseline justify-between mb-5">
              <p className="font-[family-name:var(--font-playfair)] text-[17px] italic text-[var(--fg-heading)]">
                your {year} bookshelf
              </p>
              <Link href={`/${year}/read`} className="back-link">
                all books read →
              </Link>
            </div>
            <div className="rounded-2xl p-5 overflow-x-auto bg-[var(--bg-surface)] border border-[var(--border-light)]">
              <div className="flex items-end gap-1 min-w-0">
                {shelfMonths.map(({ monthIndex, books }, si) => (
                  <div
                    key={monthIndex}
                    className="flex items-end gap-0.5 shrink-0"
                  >
                    {si > 0 && (
                      <span className="text-[8px] uppercase font-bold mx-2 self-end pb-1 text-[var(--fg-faint)] tracking-[0.1em]">
                        {MONTH_NAMES[monthIndex].slice(0, 3)}
                      </span>
                    )}
                    {si === 0 && (
                      <span className="text-[8px] uppercase font-bold mr-2 self-end pb-1 text-[var(--fg-faint)] tracking-[0.1em]">
                        {MONTH_NAMES[monthIndex].slice(0, 3)}
                      </span>
                    )}
                    {books.map((b) => (
                      <Link
                        key={b.id}
                        href={`/book/${b.id}`}
                        title={b.title}
                        style={{ height: spineHeightPx(b.title) }}
                        className={`rounded-sm shrink-0 hover:brightness-110 transition-all hover:-translate-y-1 w-[14px] ${spineColorClass(b.title)}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lists */}
        {lists.length > 0 && (
          <div className="mb-12">
            <div className="flex items-baseline justify-between mb-5">
              <p className="font-[family-name:var(--font-playfair)] text-[17px] italic text-[var(--fg-heading)]">
                {year} lists
              </p>
              <Link href={`/${year}/lists`} className="back-link">
                all lists →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {lists.map((list) => (
                <Link
                  key={list.id}
                  href={`/${year}/lists/${list.id}`}
                  className="block rounded-xl p-4 transition-colors hover:bg-[var(--bg-subtle)] border border-[var(--border-light)]"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-[13px] font-semibold leading-snug text-[var(--fg-heading)]">
                      {list.title}
                    </p>
                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-muted-tag)] text-[var(--fg-muted)]">
                      {list.items.length}
                    </span>
                  </div>
                  {list.items.length === 0 ? (
                    <p className="text-[11px] italic text-[var(--fg-faint)]">
                      empty
                    </p>
                  ) : (
                    <ol className="space-y-1">
                      {list.items.slice(0, 4).map((item, i) => (
                        <li key={item.id} className="flex items-baseline gap-2">
                          <span className="text-[10px] w-4 shrink-0 tabular-nums text-[var(--fg-faint)]">
                            {i + 1}.
                          </span>
                          <span className="text-xs truncate text-[var(--fg)]">
                            {item.title}
                          </span>
                          {item.author && (
                            <span className="text-[11px] shrink-0 hidden sm:block text-[var(--fg-muted)]">
                              {item.author}
                            </span>
                          )}
                        </li>
                      ))}
                      {list.items.length > 4 && (
                        <li className="text-[11px] pl-6 text-[var(--fg-faint)]">
                          +{list.items.length - 4} more
                        </li>
                      )}
                    </ol>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="pt-5 border-t border-[var(--border-light)] flex flex-wrap gap-x-5 gap-y-1.5">
          <Link href="/" className="back-link">
            ← home
          </Link>
          <Link
            href={`/${year}/${MONTH_ABBRS[now.getMonth()]}`}
            className="back-link"
          >
            this month →
          </Link>
          <Link href={`/${year}/stats`} className="back-link">
            year stats →
          </Link>
          <Link href={`/${year}/goal`} className="back-link">
            goals →
          </Link>
        </div>
      </div>
    </div>
  );
}
