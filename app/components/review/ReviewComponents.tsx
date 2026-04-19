"use client";

import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { formatDate } from "@/lib/dates";
import type { BookEntry } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────

export function countBy<T>(
  items: T[],
  key: (item: T) => string,
): [string, number][] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function countTags<T>(
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

export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function fmtPages(n: number): string {
  return n.toLocaleString();
}

export function uniqueById(books: BookEntry[]) {
  return books.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
}

// ─── Primitives ───────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label mb-5">{children}</p>;
}

export function BarList({
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

export function BookRow({ book, meta }: { book: BookEntry; meta?: string }) {
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

// ─── Sections ─────────────────────────────────────────────────────

export function MonthlyChart({
  months,
  maxMonthly,
}: {
  months: { key: string; label: string; count: number }[];
  maxMonthly: number;
}) {
  return (
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
                  ? { height: `${Math.round((m.count / maxMonthly) * 100)}%` }
                  : undefined
              }
              className={`w-full rounded-t-sm transition-all min-h-[2px] ${
                m.count > 0
                  ? "[background-image:var(--gradient-chart-month)]"
                  : "bg-[var(--border-light)] h-[2px]"
              }`}
            />
            <span className="text-[9px] text-[var(--fg-faint)]">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RatingsAndFormats({
  ratingDist,
  maxRatingCount,
  dnfs,
  formatCounts,
}: {
  ratingDist: Record<number, number>;
  maxRatingCount: number;
  dnfs: BookEntry[];
  formatCounts: [string, number][];
}) {
  return (
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
          <BarList items={formatCounts} max={formatCounts[0][1]} color="gradient" />
        </div>
      )}
    </div>
  );
}

export function MissingDataCard({
  printMissingPages,
  audioMissingHours,
}: {
  printMissingPages: BookEntry[];
  audioMissingHours: BookEntry[];
}) {
  if (!printMissingPages.length && !audioMissingHours.length) return null;
  return (
    <div className="mb-14 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] p-5">
      <p className="text-sm text-[var(--fg)] mb-2">
        Add missing details to make these counts accurate.
      </p>
      <p className="text-xs text-[var(--fg-faint)] mb-4">
        Tap a book to fill in the length.
      </p>
      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
        {printMissingPages.length > 0 && (
          <div>
            <p className="text-[11px] text-[var(--fg-faint)] uppercase tracking-wide mb-2">
              missing page count · {printMissingPages.length}
            </p>
            <div className="space-y-0.5">
              {printMissingPages.map((b) => (
                <BookRow key={b.id} book={b} meta="add pages" />
              ))}
            </div>
          </div>
        )}
        {audioMissingHours.length > 0 && (
          <div>
            <p className="text-[11px] text-[var(--fg-faint)] uppercase tracking-wide mb-2">
              missing audio length · {audioMissingHours.length}
            </p>
            <div className="space-y-0.5">
              {audioMissingHours.map((b) => (
                <BookRow key={b.id} book={b} meta="add hours" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BarSection({
  label,
  items,
  color,
}: {
  label: string;
  items: [string, number][];
  color: string;
}) {
  if (!items.length) return null;
  return (
    <div className="mb-14">
      <SectionLabel>{label}</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-x-10">
        <BarList items={items} max={items[0][1]} color={color} />
      </div>
    </div>
  );
}

export function GenreSection({ items }: { items: [string, number][] }) {
  if (!items.length) return null;
  return (
    <div className="mb-14">
      <SectionLabel>genres & sub-genres</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-2.5">
        {items.map(([genre, count]) => (
          <div key={genre}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-[var(--fg)]">{genre}</span>
              <span className="text-xs text-[var(--fg-faint)]">{count}</span>
            </div>
            <ProgressBar value={count / (items[0][1] || 1)} color="gradient" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShortestLongestSection({
  shortestPrint,
  longestPrint,
  shortestAudio,
  longestAudio,
}: {
  shortestPrint: BookEntry | null;
  longestPrint: BookEntry | null;
  shortestAudio: BookEntry | null;
  longestAudio: BookEntry | null;
}) {
  if (!shortestPrint && !shortestAudio) return null;
  return (
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
                <p className="text-[10px] text-[var(--fg-faint)] mb-0.5">shortest</p>
                <BookRow book={shortestPrint} meta={`${fmtPages(shortestPrint.pageCount!)} pp`} />
              </div>
            )}
            {longestPrint && longestPrint.id !== shortestPrint?.id && (
              <div>
                <p className="text-[10px] text-[var(--fg-faint)] mb-0.5">longest</p>
                <BookRow book={longestPrint} meta={`${fmtPages(longestPrint.pageCount!)} pp`} />
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
                <p className="text-[10px] text-[var(--fg-faint)] mb-0.5">shortest</p>
                <BookRow book={shortestAudio} meta={fmtHours(shortestAudio.audioDurationMinutes!)} />
              </div>
            )}
            {longestAudio && longestAudio.id !== shortestAudio?.id && (
              <div>
                <p className="text-[10px] text-[var(--fg-faint)] mb-0.5">longest</p>
                <BookRow book={longestAudio} meta={fmtHours(longestAudio.audioDurationMinutes!)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BookListSection({
  label,
  books,
  getMeta,
}: {
  label: string;
  books: BookEntry[];
  getMeta?: (b: BookEntry) => string | undefined;
}) {
  if (!books.length) return null;
  return (
    <div className="mb-14">
      <SectionLabel>{label}</SectionLabel>
      <div className="space-y-0.5">
        {books.map((b) => (
          <BookRow key={b.id} book={b} meta={getMeta?.(b)} />
        ))}
      </div>
    </div>
  );
}

export function RereadsSection({
  rereads,
  uniqueRereads,
}: {
  rereads: BookEntry[];
  uniqueRereads: BookEntry[];
}) {
  if (!uniqueRereads.length) return null;
  return (
    <BookListSection
      label={`re-reads · ${rereads.length}`}
      books={uniqueRereads}
      getMeta={(b) =>
        b.dateFinished
          ? formatDate(b.dateFinished, { month: "short", day: "numeric" })
          : undefined
      }
    />
  );
}
