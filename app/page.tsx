"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog } from "@/lib/habits";
import { getGoals } from "@/lib/goals";
import { getDisplayName, hasImportedGoodreads } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import type { BookEntry, ReadingLogEntry, ReadingGoal } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_ABBRS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const CURRENT_MONTH_ABBR = MONTH_ABBRS[new Date().getMonth()];
const CURRENT_MONTH_KEY = `${CURRENT_YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 17) return "good afternoon";
  return "good evening";
}

function formatLogDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Last N days streak bars
function StreakBars({ loggedDates, days = 14 }: { loggedDates: Set<string>; days?: number }) {
  const today = new Date();
  const bars: { dateStr: string; logged: boolean; isToday: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    bars.push({ dateStr, logged: loggedDates.has(dateStr), isToday: i === 0 });
  }
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
      {bars.map(({ dateStr, logged, isToday }) => {
        const h = logged ? (isToday ? 28 : Math.floor(Math.random() * 10) + 16) : 6;
        // Use seeded height based on date so it's stable
        const seed = dateStr.split("-").reduce((a, b) => a + Number(b), 0);
        const stableH = logged ? 14 + (seed % 16) : 5;
        return (
          <div
            key={dateStr}
            className="rounded-sm flex-1"
            style={{
              height: stableH,
              background: logged
                ? isToday
                  ? "#7B9E87"
                  : "rgba(123,158,135,0.6)"
                : "rgba(45,27,46,0.08)",
            }}
          />
        );
      })}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [reading, setReading] = useState<BookEntry[]>([]);
  const [recentlyFinished, setRecentlyFinished] = useState<BookEntry[]>([]);
  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [autoGoal, setAutoGoal] = useState<ReadingGoal | null>(null);
  const [finishedThisYear, setFinishedThisYear] = useState(0);
  const [archivedYears, setArchivedYears] = useState<{ year: number; books: number }[]>([]);
  const [goodreadsImported, setGoodreadsImported] = useState(true);

  useEffect(() => {
    async function load() {
      const [allBooks, log, goals] = await Promise.all([
        getEntries(),
        getReadingLog(CURRENT_YEAR),
        getGoals(CURRENT_YEAR),
      ]);

      setReading(allBooks.filter((b) => b.status === "reading"));
      setLogEntries(log as ReadingLogEntry[]);

      const finished = allBooks
        .filter((b) => b.status === "finished" && b.dateFinished)
        .sort((a, b) => b.dateFinished!.localeCompare(a.dateFinished!));

      const thisYear = finished.filter((b) => b.dateFinished?.startsWith(`${CURRENT_YEAR}`));
      setFinishedThisYear(thisYear.length);
      setRecentlyFinished(finished.slice(0, 3));

      const auto = goals.find((g) => g.isAuto) ?? null;
      setAutoGoal(auto);

      const yearSet = new Set<number>();
      allBooks.forEach((b) => {
        const d = b.dateFinished || b.dateStarted || b.createdAt;
        if (d) yearSet.add(new Date(d).getFullYear());
      });
      const archive = Array.from(yearSet)
        .filter((y) => y !== CURRENT_YEAR)
        .sort((a, b) => b - a)
        .map((year) => ({
          year,
          books: allBooks.filter((b) => {
            const d = b.dateFinished || b.dateStarted || b.createdAt;
            return d && new Date(d).getFullYear() === year;
          }).length,
        }));
      setArchivedYears(archive);
    }
    load().catch(console.error);
    hasImportedGoodreads().then(setGoodreadsImported);
  }, []);

  const name = user ? getDisplayName(user) : "";

  const loggedDates = new Set(logEntries.map((e) => e.logDate));

  // Current streak
  const currentStreak = (() => {
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const d = new Date(today);
    while (loggedDates.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  // Recent log entries with notes (most recent first)
  const recentEntries = [...logEntries]
    .filter((e) => e.note.trim())
    .sort((a, b) => b.logDate.localeCompare(a.logDate))
    .slice(0, 3);

  // Month progress for auto goal
  const goalTarget = autoGoal?.target ?? 0;
  const goalProgress = goalTarget > 0 ? Math.min(1, finishedThisYear / goalTarget) : 0;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="page">
      <div className="page-content" style={{ maxWidth: "44rem" }}>

        {/* Greeting */}
        <div className="mb-8">
          <p
            className="font-[family-name:var(--font-playfair)] text-3xl font-semibold tracking-tight"
            style={{ color: "var(--fg-heading)" }}
          >
            {greeting()}{name ? `, ${name}` : ""}.
          </p>
          <p
            className="font-[family-name:var(--font-caveat)] text-[17px] mt-1"
            style={{ color: "var(--terra, #C97B5A)" }}
          >
            {todayLabel}{currentStreak >= 2 ? ` · ${currentStreak}-day streak 🔥` : ""}
          </p>
        </div>

        {/* Currently reading */}
        {reading.length > 0 && (
          <div className="mb-6">
            {reading.map((book) => (
              <Link key={book.id} href={`/book/${book.id}`} className="block group mb-3">
                <div
                  className="p-4 rounded-2xl transition-opacity group-hover:opacity-90"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "var(--fg-faint)" }}>
                    currently reading
                  </p>
                  <p className="text-[15px] font-semibold leading-snug" style={{ color: "var(--fg-heading)", fontFamily: "var(--font-playfair), serif" }}>
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>{book.author}</p>
                  )}
                  {book.moodTags.length > 0 && (
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {book.moodTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Three index cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">

          {/* Streak card */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--fg-faint)" }}>
              reading streak
            </p>
            <StreakBars loggedDates={loggedDates} days={14} />
            <p
              className="font-[family-name:var(--font-playfair)] text-[22px] font-bold mt-2 leading-none"
              style={{ color: "var(--fg-heading)" }}
            >
              {currentStreak}
            </p>
            <p className="text-[9px] mt-0.5 font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--fg-faint)" }}>
              {currentStreak === 1 ? "day" : "days"}
            </p>
          </div>

          {/* Year goal card */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--fg-faint)" }}>
              {CURRENT_YEAR} goal
            </p>
            {goalTarget > 0 ? (
              <>
                <p
                  className="font-[family-name:var(--font-playfair)] text-[17px] font-bold leading-tight mb-2"
                  style={{ color: "var(--fg-heading)" }}
                >
                  {finishedThisYear} / {goalTarget}
                  <span className="text-[11px] font-normal ml-1" style={{ color: "var(--fg-muted)" }}>books</span>
                </p>
                <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(45,27,46,0.07)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(goalProgress * 100)}%`, background: "#7B9E87" }}
                  />
                </div>
                <p
                  className="font-[family-name:var(--font-caveat)] text-[13px]"
                  style={{ color: "#7B9E87" }}
                >
                  {goalProgress >= 1
                    ? "goal reached 🌿"
                    : goalProgress >= 0.75
                    ? "almost there 🌿"
                    : goalProgress >= 0.5
                    ? "halfway there"
                    : "keep reading"}
                </p>
              </>
            ) : (
              <Link href={`/${CURRENT_YEAR}/goal`} className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--fg-faint)" }}>
                set a goal →
              </Link>
            )}
          </div>

          {/* Journal key */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--fg-faint)" }}>
              journal key
            </p>
            <div className="space-y-2">
              {[
                { symbol: "●", bg: "rgba(201,123,90,0.15)", color: "#C97B5A", label: "finished" },
                { symbol: "—", bg: "rgba(123,158,135,0.15)", color: "#7B9E87", label: "reading day" },
                { symbol: "✦", bg: "rgba(212,168,67,0.15)", color: "#D4A843", label: "quote" },
                { symbol: "○", bg: "rgba(196,181,212,0.2)", color: "#b5a9c9", label: "dnf" },
              ].map(({ symbol, bg, color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="text-[11px] w-5 h-5 flex items-center justify-center rounded shrink-0 font-medium"
                    style={{ background: bg, color }}
                  >
                    {symbol}
                  </span>
                  <span
                    className="font-[family-name:var(--font-caveat)] text-[13px]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent log entries with notes */}
        {recentEntries.length > 0 && (
          <div className="mb-8">
            <p
              className="font-[family-name:var(--font-caveat)] text-[14px] mb-3"
              style={{ color: "var(--fg-muted)" }}
            >
              recent entries
            </p>
            <div className="space-y-2.5">
              {recentEntries.map((entry) => {
                const isFinishDay = recentlyFinished.some((b) => b.dateFinished === entry.logDate);
                return (
                  <Link
                    key={entry.id}
                    href={`/${CURRENT_YEAR}/${CURRENT_MONTH_ABBR}`}
                    onClick={() => {/* calendar will open panel */}}
                    className="block group"
                  >
                    <div
                      className="rounded-xl px-4 py-3 transition-opacity group-hover:opacity-90"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-light)",
                        borderLeft: `3px solid ${isFinishDay ? "#C97B5A" : "#7B9E87"}`,
                      }}
                    >
                      <p className="text-[10px] font-semibold mb-1.5" style={{ color: isFinishDay ? "#C97B5A" : "#7B9E87" }}>
                        {formatLogDate(entry.logDate)}{isFinishDay ? " · ✦ Finished!" : ""}
                      </p>
                      <p
                        className="text-[13px] leading-relaxed line-clamp-3"
                        style={{ color: "var(--fg)", fontFamily: "var(--font-playfair), Georgia, serif" }}
                      >
                        {entry.note}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recently finished (if no log entries) */}
        {recentEntries.length === 0 && recentlyFinished.length > 0 && (
          <div className="mb-8">
            <p className="section-label mb-3">recently read</p>
            <div className="space-y-1">
              {recentlyFinished.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="flex items-baseline gap-3 py-1.5 -mx-1 px-1 rounded-lg hover:bg-[rgba(45,27,46,0.04)] transition-colors group"
                >
                  <p className="text-sm flex-1 truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-xs shrink-0 hidden sm:block truncate" style={{ color: "var(--fg-faint)" }}>
                      {book.author}
                    </p>
                  )}
                  {book.rating > 0 && (
                    <p className="text-[10px] shrink-0" style={{ color: "#D4A843" }}>
                      {"★".repeat(Math.round(book.rating))}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer links */}
        <div
          className="pt-5 border-t flex flex-wrap gap-x-5 gap-y-1.5"
          style={{ borderColor: "var(--border-light)" }}
        >
          <Link href="/library" className="back-link">library →</Link>
          <Link href={`/${CURRENT_YEAR}/stats`} className="back-link">{CURRENT_YEAR} in review →</Link>
          {!goodreadsImported && (
            <Link href="/profile" className="back-link">import from goodreads →</Link>
          )}
          {archivedYears.map((j) => (
            <Link key={j.year} href={`/${j.year}/${MONTH_ABBRS[new Date().getMonth()]}`} className="back-link">
              {j.year} · {j.books} books →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
