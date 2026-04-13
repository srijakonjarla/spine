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

const SPINE_COLOR_CLASSES = [
  "bg-[var(--year-shelf-0)]", "bg-[var(--year-shelf-1)]", "bg-[var(--year-shelf-2)]", "bg-[var(--year-shelf-3)]", "bg-[var(--year-shelf-4)]",
  "bg-[var(--year-shelf-5)]", "bg-[var(--year-shelf-6)]", "bg-[var(--year-shelf-7)]", "bg-[var(--year-shelf-8)]", "bg-[var(--year-shelf-9)]",
  "bg-[var(--year-shelf-10)]", "bg-[var(--year-shelf-11)]", "bg-[var(--year-shelf-12)]", "bg-[var(--year-shelf-13)]", "bg-[var(--year-shelf-14)]",
  "bg-[var(--year-shelf-15)]", "bg-[var(--year-shelf-16)]", "bg-[var(--year-shelf-17)]", "bg-[var(--year-shelf-18)]",
] as const;
function spineColorClass(title: string) { return SPINE_COLOR_CLASSES[hashStr(title) % SPINE_COLOR_CLASSES.length]; }
function spineHeightPx(title: string) { return 44 + (hashStr(title) % 26); }

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
      className={`block rounded-xl p-3 transition-opacity hover:opacity-80 bg-[var(--bg-surface)] ${
        isThisMonth
          ? "border-[1.5px] border-[var(--border-terra-soft)]"
          : "border border-[var(--border-light)]"
      } ${isFutureMonth ? "opacity-[0.45]" : ""}`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-semibold text-[var(--fg-muted)]">
          {MONTH_NAMES[monthIndex]}
        </p>
        {booksThisMonth > 0 && (
          <p className="text-[9px] text-sage">
            {booksThisMonth} {booksThisMonth === 1 ? "book" : "books"}
          </p>
        )}
        {isFutureMonth && (
          <p className="text-[9px] font-[family-name:var(--font-caveat)] text-[var(--fg-faint)]">
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

            const bgClass =
              isToday  ? "bg-plum" :
              isFinish ? "bg-[var(--bg-terra-70)]" :
              isLogged ? "bg-[var(--bg-sage-50)]" :
              isFuture ? "bg-[var(--bg-plum-trace)]" :
                         "bg-[var(--bg-plum-soft)]";

            return (
              <div
                key={i}
                className={`rounded-[2px] h-[5px] ${isFuture ? "opacity-40" : ""} ${bgClass}`}
              />
            );
          })}
        </div>
      )}

      {!isFutureMonth && !monthHasActivity && (
        <p className="text-[9px] font-[family-name:var(--font-caveat)] mt-1 text-[var(--fg-faint)]">
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

  useEffect(() => {
    Promise.all([getEntries(), getReadingLog(year), getGoals(year), getQuotes(), getLists(year)])
      .then(([books, log, gs, quotes, ls]) => {
        setAllBooks(books);
        setLogEntries(log as ReadingLogEntry[]);
        setGoals(gs);
        setQuoteCount(quotes.filter(q => q.createdAt.startsWith(`${year}`)).length);
        setLists(ls);
      })
      .catch(console.error);
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
      <div className="-mt-6 -mx-6 mb-10 px-8 py-10 lg:px-12 lg:py-14 bg-plum">
        <div className="max-w-3xl mx-auto lg:ml-0">
          <p className="font-[family-name:var(--font-caveat)] text-lg mb-1 text-gold tracking-[0.06em]">
            your reading year
          </p>
          <h1 className="font-[family-name:var(--font-playfair)] font-bold italic leading-none mb-2 text-[clamp(52px,8vw,80px)] text-white">
            {year}
          </h1>
          <p className="text-[13px] mb-8 text-white/45">
            {statusLabel}
          </p>

          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { val: finishedBooks.length, label: "Books read", sub: autoGoal ? `goal: ${autoGoal.target}` : null },
              { val: loggedDates.size,     label: "Days read",  sub: null },
              { val: avgRating ? `${avgRating}★` : "—", label: "Avg rating", sub: null },
              { val: quoteCount,           label: "Quotes saved", sub: null },
            ].map(({ val, label, sub }) => (
              <div key={label}>
                <p className="font-[family-name:var(--font-playfair)] font-bold leading-none mb-1 text-[clamp(22px,4vw,32px)] text-white">
                  {val}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">
                  {label}
                </p>
                {sub && <p className="text-[10px] mt-0.5 text-white/30">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Goal progress blocks */}
          {(autoGoal || customGoals.length > 0) && (
            <div className="flex flex-wrap gap-3">
              {autoGoal && goalProgress !== null && (
                <div className="rounded-xl px-4 py-3 min-w-[200px] bg-white/7 border border-white/10">
                  <p className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1 text-gold/70">
                    {autoGoal.name || "reading goal"}
                  </p>
                  <p className="font-[family-name:var(--font-playfair)] text-[15px] font-semibold mb-2 text-white">
                    {finishedBooks.length} of {autoGoal.target} books · {Math.round(goalProgress * 100)}%
                  </p>
                  <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                    <div
                      style={{ width: `${Math.round(goalProgress * 100)}%` }}
                      className="h-full rounded-full bg-[linear-gradient(90deg,#7B9E87,#C97B5A)]"
                    />
                  </div>
                </div>
              )}
              {customGoals.map(g => {
                const p = g.target > 0 ? Math.min(1, g.bookIds.length / g.target) : 0;
                return (
                  <div key={g.id} className="rounded-xl px-4 py-3 min-w-[180px] bg-white/7 border border-white/10">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="page-content max-w-[56rem]">

        {/* 12 mini month calendars */}
        <div className="mb-12">
          <p className="font-[family-name:var(--font-playfair)] text-[17px] italic mb-5 text-[var(--fg-heading)]">
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
            <p className="font-[family-name:var(--font-playfair)] text-[17px] italic mb-5 text-[var(--fg-heading)]">
              your {year} bookshelf
            </p>
            <div className="rounded-2xl p-5 overflow-x-auto bg-[var(--bg-surface)] border border-[var(--border-light)]">
              <div className="flex items-end gap-1 min-w-0">
                {shelfMonths.map(({ monthIndex, books }, si) => (
                  <div key={monthIndex} className="flex items-end gap-0.5 shrink-0">
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
                    {books.map(b => (
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
              <Link href={`/${year}/lists`} className="back-link">all lists →</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {lists.map(list => (
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
                    <p className="text-[11px] italic text-[var(--fg-faint)]">empty</p>
                  ) : (
                    <ol className="space-y-1">
                      {list.items.slice(0, 4).map((item, i) => (
                        <li key={item.id} className="flex items-baseline gap-2">
                          <span className="text-[10px] w-4 shrink-0 tabular-nums text-[var(--fg-faint)]">{i + 1}.</span>
                          <span className="text-[12px] truncate text-[var(--fg)]">{item.title}</span>
                          {item.author && (
                            <span className="text-[11px] shrink-0 hidden sm:block text-[var(--fg-muted)]">{item.author}</span>
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
          <Link href="/" className="back-link">← home</Link>
          <Link href={`/${year}/${MONTH_ABBRS[now.getMonth()]}`} className="back-link">this month →</Link>
          <Link href={`/${year}/stats`} className="back-link">year stats →</Link>
          <Link href={`/${year}/goal`} className="back-link">goals →</Link>
        </div>
      </div>
    </div>
  );
}
