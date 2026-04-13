"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog } from "@/lib/habits";
import { getGoals } from "@/lib/goals";
import { getDisplayName, hasImportedGoodreads } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import type { BookEntry, ReadingLogEntry, ReadingGoal } from "@/types";
import { FireIcon, LeafIcon, StarIcon } from "@phosphor-icons/react";
import { TW_HEIGHT_PCT, TW_WIDTH_PCT } from "@/lib/twClassMaps";

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_ABBRS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const CURRENT_MONTH_ABBR = MONTH_ABBRS[new Date().getMonth()];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 17) return "good afternoon";
  return "good evening";
}

function formatLogDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

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
    <div className="flex items-end gap-[3px] h-8">
      {bars.map(({ dateStr, logged, isToday }) => {
        const seed = dateStr.split("-").reduce((a, b) => a + Number(b), 0);
        const stableH = logged ? 14 + (seed % 16) : 5;
        const heightClass = TW_HEIGHT_PCT[stableH] ?? "h-5";
        const bgClass = logged ? (isToday ? "bg-sage" : "bg-[var(--bg-sage-60)]") : "bg-[var(--bg-plum-mid)]";
        return <div key={dateStr} className={`rounded-sm flex-1 ${bgClass} ${heightClass}`} />;
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
    if (!user) return;
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

      setAutoGoal(goals.find((g) => g.isAuto) ?? null);

      const yearSet = new Set<number>();
      allBooks.forEach((b) => {
        const d = b.dateFinished || b.dateStarted || b.createdAt;
        if (d) yearSet.add(new Date(d).getFullYear());
      });
      setArchivedYears(
        Array.from(yearSet)
          .filter((y) => y !== CURRENT_YEAR)
          .sort((a, b) => b - a)
          .map((year) => ({
            year,
            books: allBooks.filter((b) => {
              const d = b.dateFinished || b.dateStarted || b.createdAt;
              return d && new Date(d).getFullYear() === year;
            }).length,
          }))
      );
    }
    load().catch(console.error);
    hasImportedGoodreads().then(setGoodreadsImported);
  }, [user?.id]);

  const name = user ? getDisplayName(user) : "";
  const loggedDates = new Set(logEntries.map((e) => e.logDate));

  const currentStreak = (() => {
    let streak = 0;
    const d = new Date(new Date().toISOString().slice(0, 10));
    while (loggedDates.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  const recentEntries = [...logEntries]
    .filter((e) => e.note.trim())
    .sort((a, b) => b.logDate.localeCompare(a.logDate))
    .slice(0, 3);

  const goalTarget = autoGoal?.target ?? 0;
  const goalProgress = goalTarget > 0 ? Math.min(1, finishedThisYear / goalTarget) : 0;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="page">
      <div className="page-content max-w-[44rem]">

        {/* Greeting */}
        <div className="mb-8">
          <p className="font-[family-name:var(--font-playfair)] text-3xl font-semibold tracking-tight text-[var(--fg-heading)]">
            {greeting()}{name ? `, ${name}` : ""}.
          </p>
          <p className="font-[family-name:var(--font-caveat)] text-[17px] mt-1 text-terra">
            {todayLabel}{currentStreak >= 2 && (
              <> · {currentStreak}-day streak <FireIcon size={14} weight="fill" className="inline-block text-orange-400 ml-0.5 align-text-bottom" /></>
            )}
          </p>
        </div>

        {/* Currently reading */}
        {reading.length > 0 && (
          <div className="mb-6">
            {reading.map((book) => (
              <Link key={book.id} href={`/book/${book.id}`} className="block group mb-3">
                <div className="p-4 rounded-2xl transition-opacity group-hover:opacity-90 bg-[var(--bg-surface)] border border-[var(--border-light)]">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1.5 text-[var(--fg-faint)]">
                    currently reading
                  </p>
                  <p className="text-[15px] font-semibold leading-snug font-serif text-[var(--fg-heading)]">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-xs mt-0.5 text-[var(--fg-muted)]">{book.author}</p>
                  )}
                  {book.moodTags.length > 0 && (
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {book.moodTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--fg-muted)]"
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
          <div className="rounded-2xl p-4 bg-[var(--bg-surface)] border border-[var(--border-light)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-3 text-[var(--fg-faint)]">
              reading streak
            </p>
            <StreakBars loggedDates={loggedDates} days={14} />
            <p className="font-[family-name:var(--font-playfair)] text-[22px] font-bold mt-2 leading-none text-[var(--fg-heading)]">
              {currentStreak}
            </p>
            <p className="text-[9px] mt-0.5 font-semibold uppercase tracking-[0.08em] text-[var(--fg-faint)]">
              {currentStreak === 1 ? "day" : "days"}
            </p>
          </div>

          {/* Year goal card */}
          <div className="rounded-2xl p-4 bg-[var(--bg-surface)] border border-[var(--border-light)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-2 text-[var(--fg-faint)]">
              {CURRENT_YEAR} goal
            </p>
            {goalTarget > 0 ? (
              <>
                <p className="font-[family-name:var(--font-playfair)] text-[17px] font-bold leading-tight mb-2 text-[var(--fg-heading)]">
                  {finishedThisYear} / {goalTarget}
                  <span className="text-[11px] font-normal ml-1 text-[var(--fg-muted)]">books</span>
                </p>
                <div className="h-1.5 rounded-full overflow-hidden mb-2 bg-[var(--bg-muted-tag)]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-sage ${
                      TW_WIDTH_PCT[Math.round(goalProgress * 100)] ?? "w-0"
                    }`}
                  />
                </div>
                <p className="font-[family-name:var(--font-caveat)] text-[13px] text-sage">
                  {goalProgress >= 1 ? (
                    <>goal reached <LeafIcon size={13} weight="fill" className="inline-block align-text-bottom ml-0.5" /></>
                  ) : goalProgress >= 0.75 ? (
                    <>almost there <LeafIcon size={13} weight="fill" className="inline-block align-text-bottom ml-0.5" /></>
                  ) : goalProgress >= 0.5 ? (
                    "halfway there"
                  ) : (
                    "keep reading"
                  )}
                </p>
              </>
            ) : (
              <Link href={`/${CURRENT_YEAR}/goal`} className="text-xs hover:opacity-70 transition-opacity text-[var(--fg-faint)]">
                set a goal →
              </Link>
            )}
          </div>

          {/* Journal key */}
          <div className="rounded-2xl p-4 bg-[var(--bg-surface)] border border-[var(--border-light)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-3 text-[var(--fg-faint)]">
              journal key
            </p>
            <div className="space-y-2">
              {[
                { symbol: "●", toneClass: "bg-[var(--bg-terra-15)] text-terra", label: "finished" },
                { symbol: "—", toneClass: "bg-[var(--bg-logged)] text-sage", label: "reading day" },
                { symbol: "✦", toneClass: "bg-[var(--bg-gold-15)] text-gold", label: "quote" },
                { symbol: "○", toneClass: "bg-[var(--bg-lavender-20)] text-[var(--lavender-muted)]", label: "dnf" },
              ].map(({ symbol, toneClass, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={`text-[11px] w-5 h-5 flex items-center justify-center rounded shrink-0 font-medium ${toneClass}`}
                  >
                    {symbol}
                  </span>
                  <span className="font-[family-name:var(--font-caveat)] text-[13px] text-[var(--fg-muted)]">
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
            <p className="font-[family-name:var(--font-caveat)] text-[14px] mb-3 text-[var(--fg-muted)]">
              recent entries
            </p>
            <div className="space-y-2.5">
              {recentEntries.map((entry) => {
                const isFinishDay = recentlyFinished.some((b) => b.dateFinished === entry.logDate);
                return (
                  <Link
                    key={entry.id}
                    href={`/${CURRENT_YEAR}/${CURRENT_MONTH_ABBR}`}
                    className="block group"
                  >
                    <div
                      className={`rounded-xl px-4 py-3 transition-opacity group-hover:opacity-90 bg-[var(--bg-surface)] border border-[var(--border-light)] border-l-[3px] ${
                        isFinishDay ? "border-l-terra" : "border-l-sage"
                      }`}
                    >
                      <p className={`text-[10px] font-semibold mb-1.5 ${isFinishDay ? "text-terra" : "text-sage"}`}>
                        {formatLogDate(entry.logDate)}{isFinishDay ? " · ✦ Finished!" : ""}
                      </p>
                      <p className="text-[13px] leading-relaxed line-clamp-3 text-[var(--fg)] font-serif">
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
                  className="flex items-baseline gap-3 py-1.5 -mx-1 px-1 rounded-lg hover:bg-[var(--bg-plum-trace)] transition-colors group"
                >
                  <p className="text-sm flex-1 truncate group-hover:opacity-70 transition-opacity text-[var(--fg)]">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-xs shrink-0 hidden sm:block truncate text-[var(--fg-faint)]">
                      {book.author}
                    </p>
                  )}
                  {book.rating > 0 && (
                    <span className="flex items-center shrink-0 text-gold">
                      {Array.from({ length: Math.round(book.rating) }, (_, i) => (
                        <StarIcon key={i} size={10} weight="fill" />
                      ))}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer links */}
        <div className="pt-5 border-t border-[var(--border-light)] flex flex-wrap gap-x-5 gap-y-1.5">
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
