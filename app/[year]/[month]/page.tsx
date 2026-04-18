"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog } from "@/lib/habits";
import { getQuotes } from "@/lib/quotes";
import type { BookEntry, BookRead, ReadingLogEntry, Quote } from "@/types";

// Module-level cache — survives component remounts (e.g. when Next.js
// refreshes the route on tab focus with staleTimes.dynamic = 0).
const CACHE_TTL = 30_000;
let pageCache: {
  year: number;
  books: BookEntry[];
  log: ReadingLogEntry[];
  quotes: Quote[];
  ts: number;
} | null = null;
import { DayPanel } from "@/components/calendar/DayPanel";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import {
  localDateStr,
  currentStreak,
  streakDates,
  formatMonthYear,
} from "@/lib/dates";
import { MONTH_ABBRS } from "@/lib/constants";
import { toast } from "@/lib/toast";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function MonthSpreadPage() {
  const { year: yearParam, month: monthParam } = useParams<{
    year: string;
    month: string;
  }>();
  const router = useRouter();

  const year = Number(yearParam);
  const monthIndex = Math.max(
    0,
    (MONTH_ABBRS as readonly string[]).indexOf(monthParam.toLowerCase()),
  );

  const now = new Date();
  const todayStr = localDateStr(now);

  const [allBooks, setAllBooks] = useState<BookEntry[]>([]);
  const [reading, setReading] = useState<BookEntry[]>([]);
  const [upNext, setUpNext] = useState<BookEntry[]>([]);
  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have fresh cached data for this year, restore it without hitting
    // the network. This prevents redundant fetches when Next.js remounts the
    // page on tab focus (router cache revalidation).
    if (
      pageCache &&
      pageCache.year === year &&
      Date.now() - pageCache.ts < CACHE_TTL
    ) {
      setAllBooks(pageCache.books);
      setReading(pageCache.books.filter((b) => b.status === "reading"));
      setUpNext(
        pageCache.books.filter((b) => b.status === "want-to-read" && b.upNext),
      );
      setLogEntries(pageCache.log);
      setQuotes(pageCache.quotes);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [books, log, qs] = await Promise.all([
          getEntries(),
          getReadingLog(year),
          getQuotes(),
        ]);
        pageCache = { year, books, log, quotes: qs, ts: Date.now() };
        setAllBooks(books);
        setReading(books.filter((b) => b.status === "reading"));
        setUpNext(books.filter((b) => b.status === "want-to-read" && b.upNext));
        setLogEntries(log as ReadingLogEntry[]);
        setQuotes(qs);
      } catch (message) {
        toast(message as string);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [year]);

  const monthKey = `${year}-${pad(monthIndex + 1)}`;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const isCurrentMonth =
    year === now.getFullYear() && monthIndex === now.getMonth();

  const loggedDates = new Set(logEntries.map((e) => e.logDate));
  const loggedThisMonth = new Set(
    logEntries.map((e) => e.logDate).filter((d) => d.startsWith(monthKey)),
  );
  const streak = currentStreak(loggedDates);
  const streakDays = streakDates(loggedDates);

  const finishedByDate = new Map<string, BookEntry>();
  allBooks.forEach((b) => {
    if (
      (b.status === "finished" || b.status === "did-not-finish") &&
      b.dateFinished?.startsWith(monthKey)
    ) {
      finishedByDate.set(b.dateFinished, b);
    }
  });

  const quoteDateSet = new Set(
    quotes
      .map((q) => localDateStr(new Date(q.createdAt)))
      .filter((d) => d.startsWith(monthKey)),
  );

  const cells: { day: number | null; dateStr: string }[] = [];
  for (let i = 0; i < firstDayOfWeek; i++)
    cells.push({ day: null, dateStr: "" });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, dateStr: `${monthKey}-${pad(d)}` });

  const finishedThisMonth = allBooks.filter(
    (b) =>
      (b.status === "finished" || b.status === "did-not-finish") &&
      (b.dateFinished?.startsWith(monthKey) ||
        b.dateShelved?.startsWith(monthKey)),
  );
  const quotesThisMonth = quotes.filter((q) =>
    q.createdAt.startsWith(monthKey),
  );
  const daysRead = loggedThisMonth.size;

  // streak is already computed above via streak(loggedDates)

  const monthLabel = formatMonthYear(
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`,
  );

  const goToMonth = (y: number, m: number) => {
    const newYear = m < 0 ? y - 1 : m > 11 ? y + 1 : y;
    const newMonth = m < 0 ? 11 : m > 11 ? 0 : m;
    router.push(`/${newYear}/${MONTH_ABBRS[newMonth]}`);
  };

  const handleToggled = (date: string, result: "added" | "removed") => {
    setLogEntries((prev) => {
      const next =
        result === "added"
          ? prev.some((e) => e.logDate === date)
            ? prev
            : [...prev, { id: crypto.randomUUID(), logDate: date, note: "" }]
          : prev.filter((e) => e.logDate !== date);
      if (pageCache) pageCache = { ...pageCache, log: next };
      return next;
    });
  };

  const handleNoteSaved = (date: string, note: string) => {
    setLogEntries((prev) => {
      const next = prev.map((e) => (e.logDate === date ? { ...e, note } : e));
      if (pageCache) pageCache = { ...pageCache, log: next };
      return next;
    });
  };

  const handleQuoteAdded = (q: Quote) => {
    setQuotes((prev) => {
      const next = [...prev, q];
      if (pageCache) pageCache = { ...pageCache, quotes: next };
      return next;
    });
  };

  const panelLog = selectedDate
    ? logEntries.find((e) => e.logDate === selectedDate)
    : undefined;
  const panelQuotes = selectedDate
    ? quotes.filter((q) => localDateStr(new Date(q.createdAt)) === selectedDate)
    : [];
  const panelFinished = selectedDate
    ? allBooks.filter(
        (b) =>
          (b.status === "finished" || b.status === "did-not-finish") &&
          (b.dateFinished === selectedDate || b.dateShelved === selectedDate),
      )
    : [];
  const panelStarted = selectedDate
    ? allBooks.filter(
        (b) =>
          b.status !== "want-to-read" &&
          b.dateStarted === selectedDate &&
          b.dateFinished !== selectedDate &&
          b.dateShelved !== selectedDate,
      )
    : [];
  const panelReading = selectedDate === todayStr ? reading : [];
  const panelFinishedIds = new Set(panelFinished.map((b) => b.id));
  const panelStartedIds = new Set(panelStarted.map((b) => b.id));
  const panelBookLog = selectedDate
    ? allBooks.flatMap((b) => {
        if (panelFinishedIds.has(b.id) || panelStartedIds.has(b.id)) return [];
        return b.reads
          .filter((r) => {
            const readDate =
              r.status === "finished"
                ? r.dateFinished
                : r.status === "did-not-finish"
                  ? r.dateShelved
                  : r.dateStarted;
            return readDate === selectedDate;
          })
          .map((r) => ({
            bookTitle: b.title,
            bookId: b.id,
            read: r as BookRead,
          }));
      })
    : [];
  const panelThoughts = selectedDate
    ? allBooks.flatMap((b) =>
        b.thoughts
          .filter((t) => localDateStr(new Date(t.createdAt)) === selectedDate)
          .map((t) => ({
            id: t.id,
            text: t.text,
            bookTitle: b.title,
            bookId: b.id,
          })),
      )
    : [];
  const panelIsLogged = selectedDate ? loggedDates.has(selectedDate) : false;
  const panelOpen = selectedDate !== null;

  if (loading)
    return (
      <div className="page animate-pulse">
        <div className="mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-32 bg-[var(--bg-hover)] rounded" />
            <div className="flex gap-2">
              <div className="h-7 w-7 bg-[var(--bg-hover)] rounded-full" />
              <div className="h-7 w-7 bg-[var(--bg-hover)] rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-4 bg-[var(--bg-hover)] rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-[var(--bg-hover)] rounded"
              />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="page">
      <div className="mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1 text-[var(--fg-faint)]">
              reading journal · {year}
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--fg-heading)]">
              {monthLabel}
            </h1>
            <p className="text-xs mt-2 text-[var(--fg-muted)]">
              {finishedThisMonth.length > 0 &&
                `${finishedThisMonth.length} books finished`}
              {daysRead > 0 && ` · ${daysRead} days read`}
              {streak >= 3 && ` · ${streak}-day streak 🔥`}
              {quotesThisMonth.length > 0 &&
                ` · ${quotesThisMonth.length} quotes`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => goToMonth(year, monthIndex - 1)}
              className="text-sm px-2 py-1 rounded hover:bg-[var(--bg-subtle)] transition-colors text-[var(--fg-muted)]"
            >
              ←
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => goToMonth(now.getFullYear(), now.getMonth())}
                className="text-xs px-2 py-1 rounded text-[var(--fg-faint)]"
              >
                today
              </button>
            )}
            <button
              onClick={() => goToMonth(year, monthIndex + 1)}
              className="text-sm px-2 py-1 rounded hover:bg-[var(--bg-subtle)] transition-colors text-[var(--fg-muted)]"
            >
              →
            </button>
          </div>
        </div>

        <MonthCalendar
          cells={cells}
          todayStr={todayStr}
          selectedDate={selectedDate}
          loggedDates={loggedDates}
          streakDates={streakDays}
          finishedByDate={finishedByDate}
          quoteDateSet={quoteDateSet}
          onSelectDate={setSelectedDate}
        />

        {/* Two-column spread */}
        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            <p className="section-label mb-4">on the nightstand</p>
            {reading.length === 0 ? (
              <p className="text-xs text-[var(--fg-faint)]">
                nothing in progress —{" "}
                <Link
                  href={`/${year}/books`}
                  className="underline hover:opacity-70"
                >
                  start a book
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {reading.map((b) => (
                  <Link
                    key={b.id}
                    href={`/book/${b.id}`}
                    className="block group py-1"
                  >
                    <p className="text-sm font-medium truncate text-[var(--fg)] group-hover:opacity-70 transition-opacity">
                      {b.title}
                    </p>
                    {b.author && (
                      <p className="text-xs mt-0.5 truncate text-[var(--fg-muted)]">
                        {b.author}
                      </p>
                    )}
                    {b.moodTags.length > 0 && (
                      <p className="text-[10px] mt-1 text-[var(--fg-faint)]">
                        {b.moodTags.slice(0, 2).join(" · ")}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {upNext.length > 0 && (
              <div className="mt-8">
                <p className="section-label mb-4">up next on the nightstand</p>
                <div className="space-y-3">
                  {upNext.map((b) => (
                    <Link
                      key={b.id}
                      href={`/book/${b.id}`}
                      className="block group py-1"
                    >
                      <p className="text-sm font-medium truncate text-[var(--fg)] group-hover:opacity-70 transition-opacity">
                        {b.title}
                      </p>
                      {b.author && (
                        <p className="text-xs mt-0.5 truncate text-[var(--fg-muted)]">
                          {b.author}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {finishedThisMonth.length > 0 && (
              <div className="mt-8">
                <p className="section-label mb-4">finished this month</p>
                <div className="space-y-3">
                  {finishedThisMonth.map((b) => (
                    <Link
                      key={b.id}
                      href={`/book/${b.id}`}
                      className="block group py-1"
                    >
                      <p className="text-sm font-medium truncate text-[var(--fg)] group-hover:opacity-70 transition-opacity">
                        {b.title}
                      </p>
                      {b.author && (
                        <p className="text-xs mt-0.5 truncate text-[var(--fg-muted)]">
                          {b.author}
                        </p>
                      )}
                      {b.rating > 0 && (
                        <p className="text-[10px] mt-1 text-[var(--gold)]">
                          {"★".repeat(Math.round(b.rating))}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="section-label mb-4">
              saved quotes
              {quotesThisMonth.length > 0 ? ` · ${quotesThisMonth.length}` : ""}
            </p>
            {quotesThisMonth.length === 0 ? (
              <p className="text-xs text-[var(--fg-faint)]">
                no quotes saved this month —{" "}
                <Link
                  href={`/${year}/quotes`}
                  className="underline hover:opacity-70"
                >
                  view all
                </Link>
              </p>
            ) : (
              <div className="space-y-4">
                {quotesThisMonth.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="pl-3 border-l-2 border-l-[var(--lavender)]"
                  >
                    <p className="font-serif text-sm italic leading-relaxed text-[var(--fg)]">
                      &ldquo;{q.text}&rdquo;
                    </p>
                    {(q.bookTitle || q.pageNumber) && (
                      <p className="text-[10px] mt-1.5 text-[var(--fg-faint)]">
                        {q.bookTitle && <span>{q.bookTitle}</span>}
                        {q.pageNumber && <span> · p. {q.pageNumber}</span>}
                      </p>
                    )}
                  </div>
                ))}
                {quotesThisMonth.length > 5 && (
                  <Link href={`/${year}/quotes`} className="back-link">
                    {quotesThisMonth.length - 5} more →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {panelOpen && (
        <div
          className="fixed inset-0 top-14 z-[24] bg-[var(--bg-overlay)]"
          onClick={() => setSelectedDate(null)}
        />
      )}

      {/* Daily Log Panel */}
      <div
        className={`fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-full md:w-[380px] z-[25] border-l border-[var(--border-light)] bg-[var(--bg-surface)] shadow-xl transition-transform duration-300 ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedDate && (
          <DayPanel
            key={selectedDate}
            date={selectedDate}
            todayStr={todayStr}
            log={panelLog}
            dayQuotes={panelQuotes}
            dayFinished={panelFinished}
            dayStarted={panelStarted}
            dayReading={panelReading}
            dayThoughts={panelThoughts}
            dayBookLog={panelBookLog}
            isLogged={panelIsLogged}
            onClose={() => setSelectedDate(null)}
            onToggled={handleToggled}
            onNoteSaved={handleNoteSaved}
            onQuoteAdded={handleQuoteAdded}
          />
        )}
      </div>
    </div>
  );
}
