"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog } from "@/lib/habits";
import { getGoals } from "@/lib/goals";
import { getQuotes } from "@/lib/quotes";
import { getLists } from "@/lib/lists";
import type { BookEntry, BookList, ReadingLogEntry, ReadingGoal } from "@/types";

const MONTH_ABBRS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function hashStr(s: string): number {
  return Math.abs(s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));
}

const SPINE_COLORS = [
  "#C96A45", "#2D3561", "#7B9E87", "#C4B5D4", "#D4A843",
  "#8E4B2E", "#3D6F57", "#6B3A4A", "#0F2C5C", "#4A2B5A",
  "#C97B5A", "#1E3A2E", "#9C5C6F", "#5B3A2E", "#7B4A8D",
  "#2A4D8F", "#C04848", "#3A2D5C", "#4A6741",
];

function spineColor(title: string) { return SPINE_COLORS[hashStr(title) % SPINE_COLORS.length]; }
function spineHeight(title: string) { return 50 + (hashStr(title) % 26); }

function MiniMonthCal({
  year, monthIndex, loggedDates, finishedDates, todayStr, isCurrentYear,
}: {
  year: number; monthIndex: number; loggedDates: Set<string>;
  finishedDates: Set<string>; todayStr: string; isCurrentYear: boolean;
}) {
  const monthKey = `${year}-${pad(monthIndex + 1)}`;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDOW = new Date(year, monthIndex, 1).getDay();
  const isThisMonth = todayStr.startsWith(monthKey);

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDOW; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${monthKey}-${pad(d)}`);

  const booksThisMonth = Array.from(finishedDates).filter(d => d.startsWith(monthKey)).length;
  const daysLoggedThisMonth = Array.from(loggedDates).filter(d => d.startsWith(monthKey)).length;
  const monthHasActivity = daysLoggedThisMonth > 0 || booksThisMonth > 0;
  const firstDayOfMonth = `${monthKey}-01`;
  const isFutureMonth = isCurrentYear && firstDayOfMonth > todayStr;

  return (
    <Link
      href={`/${year}/${MONTH_ABBRS[monthIndex]}`}
      className="block rounded-xl p-3 transition-opacity hover:opacity-80"
      style={{
        background: "var(--bg-surface)",
        border: isThisMonth
          ? "1.5px solid rgba(201,123,90,0.4)"
          : "1px solid var(--border-light)",
        opacity: isFutureMonth ? 0.45 : 1,
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-semibold" style={{ color: "var(--fg-muted)" }}>
          {MONTH_NAMES[monthIndex]}
        </p>
        {booksThisMonth > 0 && (
          <p className="text-[9px]" style={{ color: "#7B9E87" }}>
            {booksThisMonth} {booksThisMonth === 1 ? "book" : "books"}
          </p>
        )}
        {isFutureMonth && (
          <p
            className="text-[9px] font-[family-name:var(--font-caveat)]"
            style={{ color: "var(--fg-faint)" }}
          >
            not yet written
          </p>
        )}
      </div>

      {isFutureMonth ? null : (
        <div className="grid grid-cols-7 gap-[2px]">
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const isFuture = isCurrentYear && dateStr > todayStr;
            const isFinish = finishedDates.has(dateStr);
            const isLogged = loggedDates.has(dateStr);
            const isToday = dateStr === todayStr;

            let bg = "transparent";
            if (isToday) bg = "var(--plum, #2D1B2E)";
            else if (isFinish) bg = "rgba(201,123,90,0.7)";
            else if (isLogged) bg = "rgba(123,158,135,0.5)";
            else if (isFuture) bg = "rgba(45,27,46,0.04)";
            else bg = "rgba(45,27,46,0.06)";

            return (
              <div
                key={i}
                className="rounded-[2px]"
                style={{ height: 5, background: bg, opacity: isFuture ? 0.4 : 1 }}
              />
            );
          })}
        </div>
      )}

      {!isFutureMonth && !monthHasActivity && (
        <p
          className="text-[9px] font-[family-name:var(--font-caveat)] mt-1"
          style={{ color: "var(--fg-faint)" }}
        >
          no days logged
        </p>
      )}
    </Link>
  );
}

export default function YearPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const now = new Date();
  const isCurrentYear = year === now.getFullYear();
  const todayStr = now.toISOString().slice(0, 10);

  const [allBooks, setAllBooks] = useState<BookEntry[]>([]);
  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [quoteCount, setQuoteCount] = useState(0);
  const [lists, setLists] = useState<BookList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEntries(), getReadingLog(year), getGoals(year), getQuotes(), getLists(year)])
      .then(([books, log, gs, quotes, ls]) => {
        setAllBooks(books);
        setLogEntries(log as ReadingLogEntry[]);
        setGoals(gs);
        setQuoteCount(quotes.filter(q => q.createdAt.startsWith(`${year}`)).length);
        setLists(ls);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const loggedDates = new Set(logEntries.map(e => e.logDate));

  const finishedBooks = allBooks.filter(b =>
    b.status === "finished" && b.dateFinished?.startsWith(`${year}`)
  ).sort((a, b) => a.dateFinished!.localeCompare(b.dateFinished!));

  const finishedDates = new Set(finishedBooks.map(b => b.dateFinished!));

  const avgRating = (() => {
    const rated = finishedBooks.filter(b => b.rating > 0);
    if (!rated.length) return null;
    return (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1);
  })();

  const autoGoal = goals.find(g => g.isAuto) ?? null;
  const customGoals = goals.filter(g => !g.isAuto);

  const goalProgress = autoGoal && autoGoal.target > 0
    ? Math.min(1, finishedBooks.length / autoGoal.target)
    : null;

  // Group finished books by month for bookshelf
  const booksByMonth: BookEntry[][] = Array.from({ length: 12 }, () => []);
  finishedBooks.forEach(b => {
    if (b.dateFinished) {
      const m = new Date(b.dateFinished + "T12:00:00").getMonth();
      booksByMonth[m].push(b);
    }
  });

  const shelfMonths = booksByMonth
    .map((books, i) => ({ monthIndex: i, books }))
    .filter(({ books }) => books.length > 0);

  const statusLabel = isCurrentYear
    ? `in progress · ${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
    : `complete · ${finishedBooks.length} books`;

  return (
    <div className="page">
      {/* Hero */}
      <div
        className="-mt-6 -mx-6 mb-10 px-8 py-10 lg:px-12 lg:py-14 bg-plum"
      > 
        <div className="max-w-3xl mx-auto lg:ml-0">
          <p
            className="font-[family-name:var(--font-caveat)] text-lg mb-1"
            style={{ color: "#D4A843", letterSpacing: "0.06em" }}
          >
            your reading year
          </p>
          <h1
            className="font-[family-name:var(--font-playfair)] font-bold italic leading-none mb-2"
            style={{ fontSize: "clamp(52px, 8vw, 80px)", color: "#FDFAF5" }}
          >
            {year}
          </h1>
          <p className="text-[13px] mb-8" style={{ color: "rgba(253,250,245,0.45)" }}>
            {statusLabel}
          </p>

          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              {
                val: finishedBooks.length,
                label: "Books read",
                sub: autoGoal ? `goal: ${autoGoal.target}` : null,
              },
              {
                val: loggedDates.size,
                label: "Days read",
                sub: null,
              },
              {
                val: avgRating ? `${avgRating}★` : "—",
                label: "Avg rating",
                sub: null,
              },
              {
                val: quoteCount,
                label: "Quotes saved",
                sub: null,
              },
            ].map(({ val, label, sub }) => (
              <div key={label}>
                <p
                  className="font-[family-name:var(--font-playfair)] font-bold leading-none mb-1"
                  style={{ fontSize: "clamp(22px, 4vw, 32px)", color: "#FDFAF5" }}
                >
                  {val}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(253,250,245,0.55)" }}>
                  {label}
                </p>
                {sub && (
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(253,250,245,0.3)" }}>{sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* Goal progress blocks */}
          {(autoGoal || customGoals.length > 0) && (
            <div className="flex flex-wrap gap-3">
              {autoGoal && goalProgress !== null && (
                <div
                  className="rounded-xl px-4 py-3 min-w-[200px]"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <p className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1" style={{ color: "rgba(212,168,67,0.7)" }}>
                    {autoGoal.name || "reading goal"}
                  </p>
                  <p className="font-[family-name:var(--font-playfair)] text-[15px] font-semibold mb-2" style={{ color: "#FDFAF5" }}>
                    {finishedBooks.length} of {autoGoal.target} books · {Math.round(goalProgress * 100)}%
                  </p>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round(goalProgress * 100)}%`, background: "linear-gradient(90deg, #7B9E87, #C97B5A)" }}
                    />
                  </div>
                </div>
              )}
              {customGoals.map(g => {
                const p = g.target > 0 ? Math.min(1, g.bookIds.length / g.target) : 0;
                return (
                  <div
                    key={g.id}
                    className="rounded-xl px-4 py-3 min-w-[180px]"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <p className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1" style={{ color: "rgba(212,168,67,0.7)" }}>
                      {g.name}
                    </p>
                    <p className="font-[family-name:var(--font-playfair)] text-[15px] font-semibold mb-2" style={{ color: "#FDFAF5" }}>
                      {g.bookIds.length} of {g.target} · {Math.round(p * 100)}%
                    </p>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round(p * 100)}%`, background: "#7B9E87" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: "56rem" }}>

        {/* 12 mini month calendars */}
        <div className="mb-12">
          <p
            className="font-[family-name:var(--font-playfair)] text-[17px] italic mb-5"
            style={{ color: "var(--fg-heading)" }}
          >
            {year} at a glance
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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

        {/* Bookshelf */}
        {shelfMonths.length > 0 && (
          <div className="mb-12">
            <p
              className="font-[family-name:var(--font-playfair)] text-[17px] italic mb-5"
              style={{ color: "var(--fg-heading)" }}
            >
              your {year} bookshelf
            </p>
            <div
              className="rounded-2xl p-5 overflow-x-auto"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}
            >
              <div className="flex items-end gap-1 min-w-0">
                {shelfMonths.map(({ monthIndex, books }, si) => (
                  <div key={monthIndex} className="flex items-end gap-0.5 shrink-0">
                    {si > 0 && (
                      <span
                        className="text-[8px] uppercase font-bold mx-2 self-end pb-1"
                        style={{ color: "var(--fg-faint)", letterSpacing: "0.1em" }}
                      >
                        {MONTH_NAMES[monthIndex].slice(0, 3)}
                      </span>
                    )}
                    {si === 0 && (
                      <span
                        className="text-[8px] uppercase font-bold mr-2 self-end pb-1"
                        style={{ color: "var(--fg-faint)", letterSpacing: "0.1em" }}
                      >
                        {MONTH_NAMES[monthIndex].slice(0, 3)}
                      </span>
                    )}
                    {books.map(b => (
                      <Link
                        key={b.id}
                        href={`/book/${b.id}`}
                        title={b.title}
                        className="rounded-sm shrink-0 hover:brightness-110 transition-all hover:-translate-y-1"
                        style={{
                          width: 14,
                          height: spineHeight(b.title),
                          background: spineColor(b.title),
                        }}
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
              <p className="font-[family-name:var(--font-playfair)] text-[17px] italic" style={{ color: "var(--fg-heading)" }}>
                {year} lists
              </p>
              <Link href={`/${year}/lists`} className="back-link">all lists →</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {lists.map(list => (
                <Link
                  key={list.id}
                  href={`/${year}/lists/${list.id}`}
                  className="block rounded-xl p-4 transition-colors hover:bg-[var(--bg-subtle)]"
                  style={{ border: "1px solid var(--border-light)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--fg-heading)" }}>
                      {list.title}
                    </p>
                    <span
                      className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--bg-muted-tag)", color: "var(--fg-muted)" }}
                    >
                      {list.items.length}
                    </span>
                  </div>
                  {list.items.length === 0 ? (
                    <p className="text-[11px] italic" style={{ color: "var(--fg-faint)" }}>empty</p>
                  ) : (
                    <ol className="space-y-1">
                      {list.items.slice(0, 4).map((item, i) => (
                        <li key={item.id} className="flex items-baseline gap-2">
                          <span className="text-[10px] w-4 shrink-0 tabular-nums" style={{ color: "var(--fg-faint)" }}>{i + 1}.</span>
                          <span className="text-[12px] truncate" style={{ color: "var(--fg)" }}>{item.title}</span>
                          {item.author && (
                            <span className="text-[11px] shrink-0 hidden sm:block" style={{ color: "var(--fg-muted)" }}>{item.author}</span>
                          )}
                        </li>
                      ))}
                      {list.items.length > 4 && (
                        <li className="text-[11px] pl-6" style={{ color: "var(--fg-faint)" }}>
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
        <div className="pt-5 border-t flex flex-wrap gap-x-5 gap-y-1.5" style={{ borderColor: "var(--border-light)" }}>
          <Link href="/" className="back-link">← home</Link>
          <Link href={`/${year}/${MONTH_ABBRS[now.getMonth()]}`} className="back-link">this month →</Link>
          <Link href={`/${year}/stats`} className="back-link">year stats →</Link>
          <Link href={`/${year}/goal`} className="back-link">goals →</Link>
        </div>
      </div>
    </div>
  );
}
