"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useYear } from "@/providers/YearContext";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/dates";
import type { BookEntry } from "@/types";

// ─── helpers ──────────────────────────────────────────────────────

function countBy<T>(items: T[], key: (item: T) => string): [string, number][] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function countTags<T>(
  items: T[],
  key: (item: T) => string[],
): [string, number][] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const tag of key(item)) {
      if (tag) counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtPages(n: number): string {
  return n.toLocaleString();
}

function uniqueById(books: BookEntry[]) {
  return books.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
}

// ─── sub-components ───────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label mb-5">{children}</p>;
}

function BarList({
  items,
  max,
  color = "gradient",
}: {
  items: [string, number][];
  max: number;
  color?: string;
}) {
  return (
    <div className="space-y-2.5">
      {items.map(([label, count]) => (
        <div key={label}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-[var(--fg)] capitalize">{label}</span>
            <span className="text-xs text-[var(--fg-faint)]">{count}</span>
          </div>
          <ProgressBar value={count / max} color={color} />
        </div>
      ))}
    </div>
  );
}

function BookRow({ book, meta }: { book: BookEntry; meta?: string }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="flex items-baseline gap-3 py-1.5 group"
    >
      <p className="text-sm font-medium flex-1 truncate group-hover:opacity-70 transition-opacity text-[var(--fg)]">
        {book.title}
      </p>
      {book.author && (
        <p className="text-xs shrink-0 hidden sm:block truncate text-[var(--fg-faint)]">
          {book.author}
        </p>
      )}
      {meta && (
        <span className="text-xs shrink-0 text-[var(--fg-faint)]">{meta}</span>
      )}
    </Link>
  );
}

function RatingBar({
  stars,
  count,
  max,
}: {
  stars: number;
  count: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[var(--fg-faint)] w-5 text-right shrink-0">
        {stars}★
      </span>
      <div className="flex-1 h-4 rounded bg-[var(--border)] overflow-hidden">
        <div
          style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%" }}
          className="h-full rounded bg-gold transition-all duration-500"
        />
      </div>
      <span className="text-[11px] text-[var(--fg-faint)] w-4 shrink-0">
        {count}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function YearReviewPage() {
  const { year, loading, allEntries, finishedBooks, loggedDates, lists } =
    useYear();

  // ── Library checkouts from library_loan lists ────────────────────
  // bookIds that appear in any library loan list in this year
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

  // ── Acquisition sources from book_ledger lists (type "bought") ───
  // Map bookId → source (item.notes = "from / to" field)
  const acquisitionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of lists) {
      if (list.listType !== "book_ledger") continue;
      for (const item of list.items) {
        if (item.bookId && item.type === "bought" && item.notes) {
          map.set(item.bookId, item.notes);
        }
      }
    }
    return map;
  }, [lists]);

  // ── Core stats ──────────────────────────────────────────────────
  const isAudio = (b: BookEntry) =>
    b.format === "audiobook" ||
    b.format === "library audiobook" ||
    (b.audioDurationMinutes ?? 0) > 0;

  const printBooks = finishedBooks.filter((b) => !isAudio(b));
  const audioBooks = finishedBooks.filter(isAudio);

  const totalPages = printBooks.reduce((s, b) => s + (b.pageCount ?? 0), 0);
  const totalAudioMinutes = audioBooks.reduce(
    (s, b) => s + (b.audioDurationMinutes ?? 0),
    0,
  );

  const libraryFinished = finishedBooks.filter((b) => libraryBookIds.has(b.id));

  // Re-reads: finished this year and had prior reads archived
  const rereads = finishedBooks.filter((b) => b.reads.length > 0);
  const uniqueRereads = uniqueById(rereads);

  // DNFs this year
  const dnfs = allEntries.filter(
    (b) =>
      b.status === "did-not-finish" &&
      (b.dateShelved?.startsWith(`${year}`) ||
        b.dateStarted?.startsWith(`${year}`)),
  );

  // ── Ratings distribution ────────────────────────────────────────
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const b of finishedBooks) {
    if (b.rating >= 1 && b.rating <= 5) {
      ratingDist[b.rating] = (ratingDist[b.rating] ?? 0) + 1;
    }
  }
  const maxRatingCount = Math.max(...Object.values(ratingDist), 1);
  const avgRating = (() => {
    const rated = finishedBooks.filter((b) => b.rating > 0);
    if (!rated.length) return 0;
    return rated.reduce((s, b) => s + b.rating, 0) / rated.length;
  })();

  // ── Monthly reads ───────────────────────────────────────────────
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

  // ── Genres ──────────────────────────────────────────────────────
  const genreCounts = countTags(finishedBooks, (b) => b.genres);

  // ── Formats ─────────────────────────────────────────────────────
  const formatCounts = countBy(
    finishedBooks.filter((b) => b.format),
    (b) => b.format,
  );

  // ── Publishers ──────────────────────────────────────────────────
  const publisherCounts = countBy(
    uniqueById(finishedBooks).filter((b) => b.publisher),
    (b) => b.publisher,
  ).slice(0, 10);

  // ── Where books came from (book_ledger bought entries) ───────────
  const acquiredCounts = (() => {
    const sources: string[] = [];
    for (const b of finishedBooks) {
      const src = acquisitionMap.get(b.id);
      if (src) sources.push(src);
    }
    return countBy(sources, (s) => s);
  })();

  // ── Diversity ───────────────────────────────────────────────────
  const diversityCounts = countTags(
    uniqueById(finishedBooks),
    (b) => b.diversityTags,
  );

  // ── Shortest / longest print ────────────────────────────────────
  const withPages = uniqueById(
    printBooks.filter((b) => (b.pageCount ?? 0) > 0),
  ).sort((a, b) => (a.pageCount ?? 0) - (b.pageCount ?? 0));
  const shortestPrint = withPages[0] ?? null;
  const longestPrint = withPages[withPages.length - 1] ?? null;

  // ── Shortest / longest audio ────────────────────────────────────
  const withAudio = uniqueById(
    audioBooks.filter((b) => (b.audioDurationMinutes ?? 0) > 0),
  ).sort(
    (a, b) => (a.audioDurationMinutes ?? 0) - (b.audioDurationMinutes ?? 0),
  );
  const shortestAudio = withAudio[0] ?? null;
  const longestAudio = withAudio[withAudio.length - 1] ?? null;

  // ─────────────────────────────────────────────────────────────────

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
      {/* ── Hero ── */}
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
              {totalAudioMinutes > 0 &&
                ` · ${fmtHours(totalAudioMinutes)} listened`}
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
            {/* ── Big numbers ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-14">
              <StatCard
                label="books finished"
                value={finishedBooks.length}
                accentClass="border-t-[var(--stat-border-books)]"
              />
              <StatCard
                label="pages read"
                value={totalPages > 0 ? fmtPages(totalPages) : "—"}
                accentClass="border-t-[var(--stat-border-days)]"
              />
              <StatCard
                label="hours listened"
                value={
                  totalAudioMinutes > 0 ? fmtHours(totalAudioMinutes) : "—"
                }
                accentClass="border-t-[var(--stat-border-rating)]"
              />
              <StatCard
                label="days read"
                value={loggedDates.size}
                accentClass="border-t-[var(--stat-border-quotes)]"
              />
              <StatCard
                label="re-reads"
                value={rereads.length}
                accentClass="border-t-[var(--stat-border-books)]"
              />
              <StatCard
                label="library checkouts"
                value={libraryFinished.length}
                accentClass="border-t-[var(--stat-border-days)]"
              />
              <StatCard
                label="did not finish"
                value={dnfs.length}
                accentClass="border-t-[var(--stat-border-rating)]"
              />
              <StatCard
                label="avg rating"
                value={avgRating > 0 ? `${avgRating.toFixed(1)}★` : "—"}
                accentClass="border-t-[var(--stat-border-quotes)]"
              />
            </div>

            {/* ── Monthly reads ── */}
            <div className="mb-14">
              <SectionLabel>books per month</SectionLabel>
              <div className="flex items-end gap-1.5 h-28">
                {months.map((m) => (
                  <div
                    key={m.key}
                    className="flex-1 flex flex-col justify-end items-center gap-1 h-full"
                  >
                    <div
                      style={
                        m.count > 0
                          ? {
                              height: `${Math.round((m.count / maxMonthly) * 100)}%`,
                            }
                          : undefined
                      }
                      className={`w-full rounded-t-sm transition-all min-h-[2px] ${
                        m.count > 0
                          ? "[background-image:var(--gradient-chart-month)]"
                          : "bg-[var(--border-light)] h-[2px]"
                      }`}
                    />
                    <span className="text-[9px] text-[var(--fg-faint)]">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Ratings + formats side-by-side ── */}
            <div className="grid lg:grid-cols-2 gap-12 mb-14">
              <div>
                <SectionLabel>star ratings & dnf</SectionLabel>
                <div className="space-y-2 mb-4">
                  {[5, 4, 3, 2, 1].map((s) => (
                    <RatingBar
                      key={s}
                      stars={s}
                      count={ratingDist[s] ?? 0}
                      max={maxRatingCount}
                    />
                  ))}
                </div>
                {dnfs.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-light)]">
                    <span className="text-[11px] text-[var(--fg-faint)] w-5 text-right shrink-0">
                      dnf
                    </span>
                    <div className="flex-1 h-4 rounded bg-[var(--border)] overflow-hidden">
                      <div
                        style={{
                          width: `${(dnfs.length / Math.max(maxRatingCount, dnfs.length)) * 100}%`,
                        }}
                        className="h-full rounded bg-terra/50 transition-all duration-500"
                      />
                    </div>
                    <span className="text-[11px] text-[var(--fg-faint)] w-4 shrink-0">
                      {dnfs.length}
                    </span>
                  </div>
                )}
              </div>

              {formatCounts.length > 0 && (
                <div>
                  <SectionLabel>by format / edition</SectionLabel>
                  <BarList
                    items={formatCounts}
                    max={formatCounts[0][1]}
                    color="gradient"
                  />
                </div>
              )}
            </div>

            {/* ── Genres ── */}
            {genreCounts.length > 0 && (
              <div className="mb-14">
                <SectionLabel>genres & sub-genres</SectionLabel>
                <div className="grid sm:grid-cols-2 gap-x-10 gap-y-2.5">
                  {genreCounts.map(([genre, count]) => (
                    <div key={genre}>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs text-[var(--fg)]">
                          {genre}
                        </span>
                        <span className="text-xs text-[var(--fg-faint)]">
                          {count}
                        </span>
                      </div>
                      <ProgressBar
                        value={count / (genreCounts[0][1] || 1)}
                        color="gradient"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Diversity ── */}
            {diversityCounts.length > 0 && (
              <div className="mb-14">
                <SectionLabel>by diversity</SectionLabel>
                <div className="grid sm:grid-cols-2 gap-x-10">
                  <BarList
                    items={diversityCounts}
                    max={diversityCounts[0][1]}
                    color="plum"
                  />
                </div>
              </div>
            )}

            {/* ── Publishers ── */}
            {publisherCounts.length > 0 && (
              <div className="mb-14">
                <SectionLabel>by publisher</SectionLabel>
                <div className="grid sm:grid-cols-2 gap-x-10">
                  <BarList
                    items={publisherCounts}
                    max={publisherCounts[0][1]}
                    color="sage"
                  />
                </div>
              </div>
            )}

            {/* ── Where books came from ── */}
            {acquiredCounts.length > 0 && (
              <div className="mb-14">
                <SectionLabel>where books came from</SectionLabel>
                <div className="grid sm:grid-cols-2 gap-x-10">
                  <BarList
                    items={acquiredCounts}
                    max={acquiredCounts[0][1]}
                    color="terra"
                  />
                </div>
              </div>
            )}

            {/* ── Shortest & longest ── */}
            {(shortestPrint || shortestAudio) && (
              <div className="mb-14">
                <SectionLabel>shortest & longest reads</SectionLabel>
                <div className="grid sm:grid-cols-2 gap-6">
                  {(shortestPrint || longestPrint) && (
                    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] p-5 space-y-3">
                      <p className="text-[11px] text-[var(--fg-faint)] uppercase tracking-wide">
                        print
                      </p>
                      {shortestPrint && (
                        <div>
                          <p className="text-[10px] text-[var(--fg-faint)] mb-0.5">
                            shortest
                          </p>
                          <BookRow
                            book={shortestPrint}
                            meta={`${fmtPages(shortestPrint.pageCount!)} pp`}
                          />
                        </div>
                      )}
                      {longestPrint &&
                        longestPrint.id !== shortestPrint?.id && (
                          <div>
                            <p className="text-[10px] text-[var(--fg-faint)] mb-0.5">
                              longest
                            </p>
                            <BookRow
                              book={longestPrint}
                              meta={`${fmtPages(longestPrint.pageCount!)} pp`}
                            />
                          </div>
                        )}
                    </div>
                  )}

                  {(shortestAudio || longestAudio) && (
                    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] p-5 space-y-3">
                      <p className="text-[11px] text-[var(--fg-faint)] uppercase tracking-wide">
                        audio
                      </p>
                      {shortestAudio && (
                        <div>
                          <p className="text-[10px] text-[var(--fg-faint)] mb-0.5">
                            shortest
                          </p>
                          <BookRow
                            book={shortestAudio}
                            meta={fmtHours(shortestAudio.audioDurationMinutes!)}
                          />
                        </div>
                      )}
                      {longestAudio &&
                        longestAudio.id !== shortestAudio?.id && (
                          <div>
                            <p className="text-[10px] text-[var(--fg-faint)] mb-0.5">
                              longest
                            </p>
                            <BookRow
                              book={longestAudio}
                              meta={fmtHours(
                                longestAudio.audioDurationMinutes!,
                              )}
                            />
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Re-reads ── */}
            {uniqueRereads.length > 0 && (
              <div className="mb-14">
                <SectionLabel>re-reads · {rereads.length}</SectionLabel>
                <div className="space-y-0.5">
                  {uniqueRereads.map((b) => (
                    <BookRow
                      key={b.id}
                      book={b}
                      meta={
                        b.dateFinished
                          ? formatDate(b.dateFinished, {
                              month: "short",
                              day: "numeric",
                            })
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Library checkouts ── */}
            {libraryFinished.length > 0 && (
              <div className="mb-14">
                <SectionLabel>
                  library checkouts · {libraryFinished.length}
                </SectionLabel>
                <div className="space-y-0.5">
                  {uniqueById(libraryFinished).map((b) => (
                    <BookRow key={b.id} book={b} meta={b.format || undefined} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
