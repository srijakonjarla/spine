"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog } from "@/lib/habits";
import { getQuotes } from "@/lib/quotes";
import { BookCover } from "@/components/BookCover";
import type { BookEntry, ReadingLogEntry, Quote } from "@/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function computeStreaks(loggedDates: Set<string>): Set<string> {
  // Returns dates that are part of a 2+ day consecutive streak
  const streakDates = new Set<string>();
  const sorted = Array.from(loggedDates).sort();
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    const prev = new Date(d); prev.setDate(prev.getDate() - 1);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const prevStr = prev.toISOString().slice(0, 10);
    const nextStr = next.toISOString().slice(0, 10);
    if (loggedDates.has(prevStr) || loggedDates.has(nextStr)) {
      streakDates.add(sorted[i]);
    }
  }
  return streakDates;
}

export default function SpreadPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const now = new Date();
  const [viewDate, setViewDate] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(), // 0-indexed
  }));

  const [reading, setReading] = useState<BookEntry[]>([]);
  const [allBooks, setAllBooks] = useState<BookEntry[]>([]);
  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    Promise.all([getEntries(), getReadingLog(year), getQuotes()]).then(([books, log, qs]) => {
      setAllBooks(books);
      setReading(books.filter((b) => b.status === "reading"));
      setLogEntries(log as ReadingLogEntry[]);
      setQuotes(qs);
    }).catch(console.error);
  }, [year]);

  const { year: vy, month: vm } = viewDate;
  const monthKey = `${vy}-${pad(vm + 1)}`;
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const firstDayOfWeek = new Date(vy, vm, 1).getDay(); // 0=Sun
  const todayStr = now.toISOString().slice(0, 10);
  const isCurrentMonth = vy === now.getFullYear() && vm === now.getMonth();

  // Compute sets for calendar states
  const loggedDates = new Set(logEntries.map((e) => e.logDate).filter((d) => d.startsWith(monthKey)));
  const allLoggedDates = new Set(logEntries.map((e) => e.logDate));
  const streakDates = computeStreaks(allLoggedDates);

  const finishedByDate = new Map<string, BookEntry>();
  allBooks.forEach((b) => {
    if ((b.status === "finished" || b.status === "did-not-finish") && b.dateFinished?.startsWith(monthKey)) {
      finishedByDate.set(b.dateFinished, b);
    }
  });

  const quoteDateSet = new Set(quotes.map((q) => q.createdAt.slice(0, 10)).filter((d) => d.startsWith(monthKey)));

  // Calendar grid cells
  const cells: { day: number | null; dateStr: string }[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, dateStr: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${monthKey}-${pad(d)}` });
  }

  // Books finished this month
  const finishedThisMonth = allBooks.filter((b) =>
    (b.status === "finished" || b.status === "did-not-finish") &&
    (b.dateFinished?.startsWith(monthKey) || b.dateShelved?.startsWith(monthKey))
  );

  // Quotes saved this month
  const quotesThisMonth = quotes.filter((q) => q.createdAt.startsWith(monthKey));

  // Stats
  const daysRead = loggedDates.size;
  const currentStreak = (() => {
    let streak = 0;
    let d = new Date(todayStr);
    while (allLoggedDates.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  const monthLabel = new Date(vy, vm).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setViewDate(({ year: y, month: m }) =>
    m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
  );
  const nextMonth = () => setViewDate(({ year: y, month: m }) =>
    m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
  );

  return (
    <div className="page">
      <div className="page-content" style={{ maxWidth: "56rem" }}>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--fg-faint)" }}>
              reading journal · {year}
            </p>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
              {monthLabel}
            </h1>
            <p className="text-xs mt-2" style={{ color: "var(--fg-muted)" }}>
              {finishedThisMonth.length > 0 && `${finishedThisMonth.length} books finished`}
              {daysRead > 0 && ` · ${daysRead} days read`}
              {currentStreak >= 3 && ` · ${currentStreak}-day streak 🔥`}
              {quotesThisMonth.length > 0 && ` · ${quotesThisMonth.length} quotes`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="text-sm px-2 py-1 rounded hover:bg-[rgba(45,27,46,0.06)] transition-colors" style={{ color: "var(--fg-muted)" }}>←</button>
            {!isCurrentMonth && (
              <button
                onClick={() => setViewDate({ year: now.getFullYear(), month: now.getMonth() })}
                className="text-xs px-2 py-1 rounded" style={{ color: "var(--fg-faint)" }}
              >
                today
              </button>
            )}
            <button onClick={nextMonth} className="text-sm px-2 py-1 rounded hover:bg-[rgba(45,27,46,0.06)] transition-colors" style={{ color: "var(--fg-muted)" }}>→</button>
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-10 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border-light)", background: "var(--bg-surface)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center py-2 text-[10px] uppercase tracking-wider" style={{ color: "var(--fg-faint)" }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7" style={{ background: "var(--bg-page)" }}>
            {cells.map((cell, i) => {
              if (!cell.day) return <div key={i} className="aspect-square border-r border-b" style={{ borderColor: "var(--border-light)", opacity: 0.3 }} />;

              const dateStr = cell.dateStr;
              const isToday = dateStr === todayStr;
              const isLogged = loggedDates.has(dateStr);
              const isStreak = streakDates.has(dateStr);
              const finished = finishedByDate.get(dateStr);
              const hasQuote = quoteDateSet.has(dateStr);
              const isPast = dateStr <= todayStr;

              let bg = "transparent";
              let textColor = isPast ? "var(--fg)" : "var(--fg-faint)";
              if (isToday) { bg = "var(--plum)"; textColor = "#fff"; }
              else if (finished) { bg = "rgba(201,123,90,0.15)"; }
              else if (isStreak && isLogged) { bg = "rgba(123,158,135,0.18)"; }
              else if (isLogged) { bg = "rgba(123,158,135,0.10)"; }

              return (
                <Link
                  key={i}
                  href={`/${year}/log/${dateStr}`}
                  className="aspect-square border-r border-b flex flex-col items-start justify-start p-1.5 transition-colors hover:bg-[rgba(45,27,46,0.05)] relative"
                  style={{ borderColor: "var(--border-light)", background: bg }}
                >
                  <span
                    className="text-[11px] font-medium leading-none mb-1 w-5 h-5 flex items-center justify-center rounded-full"
                    style={{ color: textColor, background: isToday ? "transparent" : undefined }}
                  >
                    {cell.day}
                  </span>
                  {finished && (
                    <span className="text-[8px] leading-tight truncate w-full" style={{ color: "#C97B5A" }}>
                      {finished.title.slice(0, 10)}{finished.title.length > 10 ? "…" : ""}
                    </span>
                  )}
                  {isLogged && !finished && (
                    <span className="w-1 h-1 rounded-full absolute bottom-1.5 left-1/2 -translate-x-1/2" style={{ background: isStreak ? "#7B9E87" : "var(--fg-faint)" }} />
                  )}
                  {hasQuote && (
                    <span className="text-[8px] absolute top-1 right-1" style={{ color: "#D4A843" }}>✦</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Two-column spread */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Left: currently reading + recent log entries */}
          <div>
            <p className="section-label mb-4">on the nightstand</p>
            {reading.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--fg-faint)" }}>
                nothing in progress —{" "}
                <Link href={`/${year}/books`} className="underline hover:opacity-70">start a book</Link>
              </p>
            ) : (
              <div className="space-y-3">
                {reading.map((b) => (
                  <Link key={b.id} href={`/book/${b.id}`} className="flex gap-3 group py-1">
                    <BookCover title={b.title} width={40} height={58} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>{b.title}</p>
                      {b.author && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>{b.author}</p>}
                      {b.moodTags.length > 0 && (
                        <p className="text-[10px] mt-1" style={{ color: "var(--fg-faint)" }}>{b.moodTags.slice(0, 2).join(" · ")}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {finishedThisMonth.length > 0 && (
              <div className="mt-8">
                <p className="section-label mb-4">finished this month</p>
                <div className="space-y-3">
                  {finishedThisMonth.map((b) => (
                    <Link key={b.id} href={`/book/${b.id}`} className="flex gap-3 group py-1">
                      <BookCover title={b.title} width={40} height={58} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>{b.title}</p>
                        {b.author && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>{b.author}</p>}
                        {b.rating > 0 && (
                          <p className="text-[10px] mt-1" style={{ color: "#D4A843" }}>{"★".repeat(Math.round(b.rating))}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: saved quotes this month */}
          <div>
            <p className="section-label mb-4">saved quotes {quotesThisMonth.length > 0 ? `· ${quotesThisMonth.length}` : ""}</p>
            {quotesThisMonth.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--fg-faint)" }}>
                no quotes saved this month —{" "}
                <Link href={`/${year}/quotes`} className="underline hover:opacity-70">view all</Link>
              </p>
            ) : (
              <div className="space-y-4">
                {quotesThisMonth.slice(0, 5).map((q) => (
                  <div key={q.id} className="pl-3" style={{ borderLeft: "2px solid var(--lavender)" }}>
                    <p className="font-[family-name:var(--font-playfair)] text-sm italic leading-relaxed" style={{ color: "var(--fg)" }}>
                      "{q.text}"
                    </p>
                    {(q.bookTitle || q.pageNumber) && (
                      <p className="text-[10px] mt-1.5" style={{ color: "var(--fg-faint)" }}>
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
    </div>
  );
}
