"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBooks } from "@/providers/BooksProvider";
import { useQuotes } from "@/providers/QuotesProvider";
import { useReadingLog } from "@/providers/ReadingLogProvider";
import type { Quote } from "@/types";
import {
  buildMonthCells,
  computeDayPanelData,
  computeMonthSpread,
  stepMonth,
} from "@spine/shared";

import { DayPanel } from "@/components/calendar/DayPanel";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import {
  localDateStr,
  currentStreak,
  streakDates,
  formatMonthYear,
} from "@/lib/dates";
import { MONTH_ABBRS } from "@/lib/constants";
import { MonthSpreadSkeleton } from "@/components/skeletons/MonthSpreadSkeleton";
import { FlameIcon } from "@phosphor-icons/react";

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

  const { books: allBooks, loading: booksLoading } = useBooks();
  const {
    quotes,
    loading: quotesLoading,
    addQuote: addQuoteToCache,
  } = useQuotes();
  const {
    logEntries,
    loggedDates,
    loading: logLoading,
    addEntry: addLogEntry,
    removeEntry: removeLogEntry,
    updateNote: updateLogNote,
  } = useReadingLog();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loading = booksLoading || quotesLoading || logLoading;

  const isCurrentMonth =
    year === now.getFullYear() && monthIndex === now.getMonth();

  const spread = useMemo(
    () =>
      computeMonthSpread({
        books: allBooks,
        quotes,
        logEntries,
        year,
        monthIndex,
      }),
    [allBooks, quotes, logEntries, year, monthIndex],
  );
  const {
    monthKey,
    reading,
    upNext,
    finishedByDate,
    quoteDatesThisMonth: quoteDateSet,
    finishedThisMonth,
    quotesThisMonth,
    daysRead,
  } = spread;

  const streak = useMemo(() => currentStreak(loggedDates), [loggedDates]);
  const streakDays = useMemo(() => streakDates(loggedDates), [loggedDates]);

  const cells = useMemo(
    () => buildMonthCells(year, monthIndex),
    [year, monthIndex],
  );

  const monthLabel = formatMonthYear(`${monthKey}-01`);

  // Prefetch adjacent months for instant navigation
  useEffect(() => {
    const prev = stepMonth(year, monthIndex, -1);
    const next = stepMonth(year, monthIndex, 1);
    router.prefetch(`/${prev.year}/${MONTH_ABBRS[prev.monthIndex]}`);
    router.prefetch(`/${next.year}/${MONTH_ABBRS[next.monthIndex]}`);
  }, [router, year, monthIndex]);

  const goToMonth = (y: number, m: number) => {
    router.push(`/${y}/${MONTH_ABBRS[m]}`);
  };
  const stepTo = (delta: number) => {
    const next = stepMonth(year, monthIndex, delta);
    goToMonth(next.year, next.monthIndex);
  };

  const handleToggled = (date: string, result: "added" | "removed") => {
    if (result === "added") {
      addLogEntry({
        id: crypto.randomUUID(),
        logDate: date,
        note: "",
        logged: true,
      });
    } else {
      removeLogEntry(date);
    }
  };

  const handleNoteSaved = (date: string, note: string) => {
    updateLogNote(date, note);
  };

  const handleQuoteAdded = (q: Quote) => {
    addQuoteToCache(q);
  };

  const panel = selectedDate
    ? computeDayPanelData({
        books: allBooks,
        quotes,
        logEntries,
        loggedDates,
        date: selectedDate,
      })
    : null;
  const panelReading = selectedDate === todayStr ? reading : [];
  const panelOpen = selectedDate !== null;

  if (loading) return <MonthSpreadSkeleton />;

  return (
    <div className="page">
      <div className="mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1 text-fg-faint">
              reading journal · {year}
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg-heading">
              {monthLabel}
            </h1>
            <p className="text-xs mt-2 text-fg-muted inline-flex items-center gap-1 flex-wrap">
              {finishedThisMonth.length > 0 &&
                `${finishedThisMonth.length} books finished`}
              {daysRead > 0 && ` · ${daysRead} days read`}
              {streak >= 3 && (
                <>
                  {` · ${streak}-day streak `}
                  <FlameIcon size={12} weight="fill" />
                </>
              )}
              {quotesThisMonth.length > 0 &&
                ` · ${quotesThisMonth.length} quotes`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => stepTo(-1)}
              className="text-sm px-2 py-1 rounded hover:bg-subtle transition-colors text-fg-muted"
            >
              ←
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => goToMonth(now.getFullYear(), now.getMonth())}
                className="text-xs px-2 py-1 rounded text-fg-faint"
              >
                today
              </button>
            )}
            <button
              onClick={() => stepTo(1)}
              className="text-sm px-2 py-1 rounded hover:bg-subtle transition-colors text-fg-muted"
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
          notesByDate={
            new Map(
              logEntries
                .filter((e) => e.note?.trim() && e.logDate.startsWith(monthKey))
                .map((e) => [e.logDate, e.note]),
            )
          }
          onSelectDate={setSelectedDate}
        />

        {/* Two-column spread */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          <div>
            <p className="section-label mb-4">on the nightstand</p>
            {reading.length === 0 ? (
              <p className="text-xs text-fg-faint">
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
                    <p className="text-sm font-medium truncate text-fg group-hover:opacity-70 transition-opacity">
                      {b.title}
                    </p>
                    {b.author && (
                      <p className="text-xs mt-0.5 truncate text-fg-muted">
                        {b.author}
                      </p>
                    )}
                    {b.moodTags.length > 0 && (
                      <p className="text-detail mt-1 text-fg-faint">
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
                      <p className="text-sm font-medium truncate text-fg group-hover:opacity-70 transition-opacity">
                        {b.title}
                      </p>
                      {b.author && (
                        <p className="text-xs mt-0.5 truncate text-fg-muted">
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
                      <p className="text-sm font-medium truncate text-fg group-hover:opacity-70 transition-opacity">
                        {b.title}
                      </p>
                      {b.author && (
                        <p className="text-xs mt-0.5 truncate text-fg-muted">
                          {b.author}
                        </p>
                      )}
                      {b.rating > 0 && (
                        <p className="text-detail mt-1 text-gold">
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
              <p className="text-xs text-fg-faint">
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
                  <div key={q.id} className="pl-3 border-l-2 border-l-lavender">
                    <p className="font-serif text-sm italic leading-relaxed text-fg">
                      &ldquo;{q.text}&rdquo;
                    </p>
                    {(q.bookTitle || q.pageNumber) && (
                      <p className="text-detail mt-1.5 text-fg-faint">
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
          className="fixed inset-0 top-14 z-[24] bg-overlay"
          onClick={() => setSelectedDate(null)}
        />
      )}

      {/* Daily Log Panel */}
      <div
        className={`fixed top-14 right-0 h-[calc(100dvh-var(--nav-height))] w-full sm:w-80 md:w-95 z-[25] border-l border-line bg-surface shadow-xl transition-transform duration-300 ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedDate && panel && (
          <DayPanel
            key={selectedDate}
            date={selectedDate}
            todayStr={todayStr}
            log={panel.log}
            dayQuotes={panel.quotes}
            dayFinished={panel.finished}
            dayStarted={panel.started}
            dayReading={panelReading}
            dayThoughts={panel.thoughts}
            dayBookLog={panel.bookLog}
            isLogged={panel.isLogged}
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
