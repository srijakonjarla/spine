"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getDisplayName, hasImportedGoodreads } from "@/lib/auth";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/lib/toast";
import type { ReadingLogEntry } from "@/types";
import { FireIcon, LeafIcon, StarIcon } from "@phosphor-icons/react";
import { MoodChip } from "@/components/MoodChip";
import { BookCoverThumb } from "@/components/BookCover";
import { ProgressBar } from "@/components/ProgressBar";
import { localDateStr, formatDate, currentStreak } from "@/lib/dates";
import { MONTH_ABBRS } from "@/lib/constants";
import { CoverPanel } from "@/components/login/CoverPanel";
import { LoginForm } from "@/components/login/LoginForm";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_ABBR = MONTH_ABBRS[new Date().getMonth()];

interface HomeReading {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  moodTags: string[];
  dateStarted: string;
}

interface HomeFinished {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  rating: number;
  dateFinished: string;
}

interface HomeGoal {
  id: string;
  year: number;
  target: number;
  name: string;
  isAuto: boolean;
  bookIds: string[];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 17) return "good afternoon";
  return "good evening";
}

function formatLogDate(iso: string) {
  return formatDate(iso, { month: "long", day: "numeric", year: "numeric" });
}

function StreakBars({
  loggedDates,
  days = 14,
}: {
  loggedDates: Set<string>;
  days?: number;
}) {
  const today = new Date();
  const bars: { dateStr: string; logged: boolean; isToday: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
    bars.push({ dateStr, logged: loggedDates.has(dateStr), isToday: i === 0 });
  }
  return (
    <div className="flex items-end gap-[3px] h-8">
      {bars.map(({ dateStr, logged, isToday }) => {
        const seed = dateStr.split("-").reduce((a, b) => a + Number(b), 0);
        const stableH = logged ? 14 + (seed % 16) : 5;
        const bgClass = logged
          ? isToday
            ? "bg-sage"
            : "bg-[var(--bg-sage-60)]"
          : "bg-plum-mid";
        return (
          <div
            key={dateStr}
            style={{ height: `${stableH}%` }}
            className={`rounded-sm flex-1 ${bgClass}`}
          />
        );
      })}
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [reading, setReading] = useState<HomeReading[]>([]);
  const [recentlyFinished, setRecentlyFinished] = useState<HomeFinished[]>([]);
  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [autoGoal, setAutoGoal] = useState<HomeGoal | null>(null);
  const [finishedThisYear, setFinishedThisYear] = useState(0);
  const [wantToRead, setWantToRead] = useState(0);
  const [goodreadsImported, setGoodreadsImported] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    async function load() {
      const res = await apiFetch(`/api/home?year=${CURRENT_YEAR}`);
      const data = await res.json();

      setReading(data.reading);
      setRecentlyFinished(data.recentlyFinished);
      setLogEntries(data.log);
      setAutoGoal(data.goal);
      setFinishedThisYear(data.finishedThisYear);
      setWantToRead(data.wantToReadCount);
    }
    load()
      .catch(() => toast("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
    hasImportedGoodreads().then(setGoodreadsImported);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const name = user ? getDisplayName(user) : "";
  const loggedDates = new Set(logEntries.map((e) => e.logDate));

  const streak = currentStreak(loggedDates);

  const recentEntries = [...logEntries]
    .filter((e) => e.note.trim())
    .sort((a, b) => b.logDate.localeCompare(a.logDate))
    .slice(0, 3);

  const goalTarget = autoGoal?.target ?? 0;
  const goalProgress =
    goalTarget > 0 ? Math.min(1, finishedThisYear / goalTarget) : 0;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Show login UI when not authenticated
  if (!authLoading && !user) {
    return (
      <div className="fixed inset-0 grid grid-cols-1 lg:grid-cols-[1fr_460px] bg-[#faf6f1] lg:bg-[#1c0e1f]">
        <CoverPanel />
        <LoginForm />
        {/* Gold seal — sits on the seam between panels, above both */}
        <div
          className="absolute hidden lg:flex items-center justify-center font-serif font-bold z-20"
          style={{
            top: 56,
            right: 442,
            width: 36,
            height: 36,
            background: "var(--gold)",
            borderRadius: "50%",
            boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
            fontSize: 20,
            color: "var(--plum)",
            lineHeight: 1,
          }}
        >
          s<span className="text-terra">.</span>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="page">
        <div className="page-content animate-pulse">
          <div className="h-5 w-36 bg-hover rounded mb-1.5" />
          <div className="h-3.5 w-48 bg-hover rounded mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-hover rounded-xl" />
            ))}
          </div>
          <div className="flex gap-3 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-14 aspect-[2/3] bg-hover rounded" />
            ))}
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-hover rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="page">
      <div className="page-content">
        {/* Greeting */}
        <div className="mb-8">
          <p className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-fg-heading">
            {greeting()}
            {name ? `, ${name}` : ""}.
          </p>
          <p className="font-hand text-subhead mt-1 text-terra">
            {todayLabel}
            {streak >= 2 && (
              <>
                {" "}
                · {streak}-day streak{" "}
                <FireIcon
                  size={14}
                  weight="fill"
                  className="inline-block text-orange-400 ml-0.5 align-text-bottom"
                />
              </>
            )}
          </p>
        </div>

        {/* Currently reading */}
        {reading.length > 0 && (
          <div className="mb-6">
            {reading.map((book) => (
              <Link
                key={book.id}
                href={`/book/${book.id}`}
                className="block group mb-3"
              >
                <div className="p-4 rounded-2xl transition-opacity group-hover:opacity-90 bg-surface border border-line">
                  <p className="text-label font-bold uppercase tracking-label mb-3 text-fg-faint">
                    currently reading
                  </p>
                  <div className="flex gap-4">
                    <BookCoverThumb
                      coverUrl={book.coverUrl}
                      title={book.title}
                      author={book.author}
                      width="w-12"
                      height="h-18"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-body-md font-semibold leading-snug text-fg-heading">
                        {book.title}
                      </p>
                      {book.author && (
                        <p className="text-xs mt-0.5 text-fg-muted">
                          {book.author}
                        </p>
                      )}
                      {book.moodTags.length > 0 && (
                        <div className="flex gap-1.5 mt-2.5 flex-wrap">
                          {book.moodTags.slice(0, 3).map((tag) => (
                            <MoodChip key={tag} mood={tag} display />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Three index cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {/* Streak card */}
          <div className="rounded-2xl p-4 bg-surface border border-line">
            <p className="text-label font-bold uppercase tracking-label mb-3 text-fg-faint">
              reading streak
            </p>
            <StreakBars loggedDates={loggedDates} days={14} />
            <p className="font-serif text-title font-bold mt-2 leading-none text-fg-heading">
              {streak}
            </p>
            <p className="text-label mt-0.5 font-semibold uppercase tracking-caps text-fg-faint">
              {streak === 1 ? "day" : "days"}
            </p>
          </div>

          {/* Year goal card */}
          <div className="rounded-2xl p-4 bg-surface border border-line">
            <p className="text-label font-bold uppercase tracking-label mb-2 text-fg-faint">
              {CURRENT_YEAR} goal
            </p>
            {goalTarget > 0 ? (
              <>
                <p className="font-serif text-subhead font-bold leading-tight mb-2 text-fg-heading">
                  {finishedThisYear} / {goalTarget}
                  <span className="text-caption font-normal ml-1 text-fg-muted">
                    books
                  </span>
                </p>
                <ProgressBar value={goalProgress} className="mb-2" />
                <p className="font-hand text-note text-sage">
                  {goalProgress >= 1 ? (
                    <>
                      goal reached{" "}
                      <LeafIcon
                        size={13}
                        weight="fill"
                        className="inline-block align-text-bottom ml-0.5"
                      />
                    </>
                  ) : goalProgress >= 0.75 ? (
                    <>
                      almost there{" "}
                      <LeafIcon
                        size={13}
                        weight="fill"
                        className="inline-block align-text-bottom ml-0.5"
                      />
                    </>
                  ) : goalProgress >= 0.5 ? (
                    "halfway there"
                  ) : (
                    "keep reading"
                  )}
                </p>
              </>
            ) : (
              <Link
                href={`/${CURRENT_YEAR}/goal`}
                className="text-xs hover:opacity-70 transition-opacity text-fg-faint"
              >
                set a goal →
              </Link>
            )}
          </div>

          {/* Shelf snapshot card */}
          <Link
            href="/library"
            className="block group rounded-2xl p-4 bg-surface border border-line transition-opacity group-hover:opacity-90"
          >
            <p className="text-label font-bold uppercase tracking-label mb-3 text-fg-faint">
              your shelf
            </p>
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="font-hand text-note text-fg-muted">
                  reading
                </span>
                <span className="font-serif text-body-md font-bold text-terra">
                  {reading.length}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-hand text-note text-fg-muted">
                  {CURRENT_YEAR}
                </span>
                <span className="font-serif text-body-md font-bold text-sage">
                  {finishedThisYear}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-hand text-note text-fg-muted">
                  want to read
                </span>
                <span className="font-serif text-body-md font-bold text-fg-muted">
                  {wantToRead}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent log entries with notes */}
        {recentEntries.length > 0 && (
          <div className="mb-8">
            <p className="font-hand text-sm mb-3 text-fg-muted">
              recent entries
            </p>
            <div className="space-y-2.5">
              {recentEntries.map((entry) => {
                const isFinishDay = recentlyFinished.some(
                  (b) => b.dateFinished === entry.logDate,
                );
                return (
                  <Link
                    key={entry.id}
                    href={`/${CURRENT_YEAR}/${CURRENT_MONTH_ABBR}`}
                    className="block group"
                  >
                    <div
                      className={`rounded-xl px-4 py-3 transition-opacity group-hover:opacity-90 bg-surface border border-line border-l-[3px] ${
                        isFinishDay ? "border-l-terra" : "border-l-sage"
                      }`}
                    >
                      <p
                        className={`text-detail font-semibold mb-1.5 ${isFinishDay ? "text-terra" : "text-sage"}`}
                      >
                        {formatLogDate(entry.logDate)}
                        {isFinishDay ? " · ✦ Finished!" : ""}
                      </p>
                      <p className="text-note leading-relaxed line-clamp-3 text-fg font-serif">
                        {entry.note}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recently finished — cover row */}
        {recentlyFinished.length > 0 && (
          <div className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <p className="section-label">recently read</p>
              <Link
                href="/library/finished"
                className="text-xs text-fg-faint hover:text-fg-muted transition-colors"
              >
                all →
              </Link>
            </div>
            <div className="flex gap-4">
              {recentlyFinished.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="group w-18 shrink-0"
                >
                  <div className="rounded-lg overflow-hidden shadow-sm mb-2 aspect-[2/3] group-hover:-translate-y-1 transition-transform">
                    <BookCoverThumb
                      coverUrl={book.coverUrl}
                      title={book.title}
                      author={book.author}
                      width="w-full"
                      height="h-full"
                    />
                  </div>
                  <p className="text-caption font-medium leading-tight truncate text-fg">
                    {book.title}
                  </p>
                  {book.rating > 0 && (
                    <span className="flex items-center mt-0.5 text-gold">
                      {Array.from(
                        { length: Math.round(book.rating) },
                        (_, i) => (
                          <StarIcon key={i} size={9} weight="fill" />
                        ),
                      )}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer links */}
        <div className="pt-5 border-t border-line flex flex-wrap gap-x-5 gap-y-1.5">
          <Link href="/library" className="back-link">
            library →
          </Link>
          <Link
            href={`/${CURRENT_YEAR}/${CURRENT_MONTH_ABBR}`}
            className="back-link"
          >
            {CURRENT_MONTH_ABBR} →
          </Link>
          <Link href={`/${CURRENT_YEAR}/review`} className="back-link">
            {CURRENT_YEAR} in review →
          </Link>
          {!goodreadsImported && (
            <Link href="/profile" className="back-link">
              import from goodreads →
            </Link>
          )}
          <Link href="/privacy" className="back-link">
            privacy →
          </Link>
          <Link href="/terms" className="back-link">
            terms →
          </Link>
        </div>
        <p className="mt-6 text-xs text-fg-faint">© 2026 spine</p>
      </div>
    </div>
  );
}
