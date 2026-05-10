"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookOpenTextIcon, QuotesIcon } from "@phosphor-icons/react";
import { heroGradientIndex } from "@spine/shared";
import { BookmarkButton } from "@/components/BookmarkButton";
import { StarRating } from "@/components/StarRating";
import { STATUSES } from "@/lib/statusMeta";
import { localDateStr } from "@/lib/dates";
import { usePreviousRoute } from "@/providers/NavigationProvider";
import type { ReadPatch } from "@/providers/BookContext";
import type { BookEntry, ReadingStatus } from "@/types";

function addDays(date: string, n: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function HeroGenreAdd({
  genres,
  onAdd,
}: {
  genres: string[];
  onAdd: (g: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");

  const commit = () => {
    const val = input.trim();
    if (val && !genres.includes(val)) onAdd(val);
    setInput("");
    setAdding(false);
  };

  if (adding) {
    return (
      <input
        id="book-genre-add"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setInput("");
            setAdding(false);
          }
        }}
        onBlur={commit}
        placeholder="genre..."
        className="hero-genre-input"
      />
    );
  }

  return (
    <button onClick={() => setAdding(true)} className="hero-genre-add-btn">
      + genre
    </button>
  );
}

function useBackLink() {
  const previous = usePreviousRoute();
  if (previous) return { label: previous.label, href: previous.pathname };
  return { label: "library", href: "/library" };
}

function statusActiveStyle(
  current: ReadingStatus,
  value: ReadingStatus,
): React.CSSProperties | undefined {
  if (current !== value) return undefined;
  if (value === "finished")
    return {
      background: "var(--terra)",
      border: "1px solid var(--terra)",
      color: "#fff",
    };
  if (value === "reading")
    return {
      background: "var(--sage)",
      border: "1px solid var(--sage)",
      color: "#fff",
    };
  if (value === "did-not-finish")
    return {
      background: "rgba(255,255,255,0.18)",
      border: "1px solid rgba(255,255,255,0.4)",
      color: "#fff",
    };
  return {
    background: "var(--lavender)",
    border: "1px solid var(--lavender)",
    color: "var(--fg-heading)",
  };
}

export function Hero({
  entry,
  quoteCount,
  saveState,
  viewedRead,
  rereadLoading,
  onUpdate,
  onUpdateRead,
  onStatusChange,
  onReread,
}: {
  entry: BookEntry;
  quoteCount: number;
  saveState: "idle" | "saving" | "saved";
  viewedRead: BookEntry["reads"][number] | null;
  rereadLoading: boolean;
  onUpdate: (patch: Partial<BookEntry>) => void;
  onUpdateRead: (readId: string, patch: ReadPatch) => Promise<void>;
  onStatusChange: (status: ReadingStatus) => void;
  onReread: () => void;
}) {
  const canReread =
    entry.reads.length > 0 ||
    entry.status === "finished" ||
    entry.status === "did-not-finish";
  const router = useRouter();
  const backLink = useBackLink();
  const heroClass = `hero-gradient-${heroGradientIndex(entry.title)}`;

  return (
    <div
      className={`${heroClass} relative overflow-hidden px-5 py-7 sm:px-10 sm:py-9 grid gap-5 sm:gap-8 grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr] md:grid-cols-[180px_1fr]`}
    >
      <div
        className="absolute -top-15 -right-15 w-60 h-60 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,168,67,0.18), transparent 70%)",
        }}
      />

      <div className="absolute top-4 left-5 z-10">
        <button
          onClick={() => router.back()}
          className="text-xs text-white/55 font-sans bg-transparent border-none cursor-pointer p-0"
        >
          ← {backLink.label}
        </button>
      </div>

      <div className="absolute top-3.5 right-5 z-10 flex items-center gap-3">
        <span className="text-caption text-white/40 font-sans">
          {saveState === "saving"
            ? "saving..."
            : saveState === "saved"
              ? "saved ✓"
              : ""}
        </span>
        <button
          onClick={() => onUpdate({ upNext: !entry.upNext })}
          title={entry.upNext ? "Remove from up next" : "Add to up next"}
          className={`relative text-caption font-sans px-2.5 py-1 rounded-full border transition-colors before:absolute before:-inset-2 before:content-[''] ${
            entry.upNext
              ? "bg-gold/20 border-gold/50 text-gold"
              : "border-white/20 text-white/40 hover:text-white/70 hover:border-white/40"
          }`}
        >
          {entry.upNext ? "up next ✓" : "up next"}
        </button>
        <BookmarkButton
          bookmarked={entry.bookmarked}
          onToggle={() => onUpdate({ bookmarked: !entry.bookmarked })}
        />
      </div>

      {/* Cover */}
      <div className="pt-6 relative z-[1]">
        {entry.coverUrl ? (
          <Image
            src={entry.coverUrl}
            alt={entry.title}
            width={180}
            height={270}
            sizes="180px"
            priority
            className="w-30 sm:w-37.5 md:w-45 rounded-lg block object-cover aspect-[2/3]"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
          />
        ) : (
          <div
            className="w-30 sm:w-37.5 md:w-45 aspect-[2/3] rounded-lg bg-white/10 flex flex-col justify-end p-3 sm:p-4"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
          >
            <p className="font-serif text-body-md italic text-white/80 leading-[1.3] mb-1.5">
              {entry.title}
            </p>
            <p className="text-detail text-white/45 font-sans">
              {entry.author}
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center relative z-[1] pt-6">
        <h1
          className="font-serif font-bold text-white leading-[1.05] mb-1 tracking-tight"
          style={{ fontSize: "clamp(26px, 3.5vw, 38px)" }}
        >
          {entry.title}
        </h1>
        <p className="font-serif text-body-md italic text-white/55 mb-[18px]">
          by {entry.author}
        </p>

        <div className="hero-overlay-card">
          <div className="flex gap-1.5 flex-wrap items-center mb-3.5">
            {STATUSES.map(({ value, label }) => {
              const swapForReread =
                value === "reading" && canReread && entry.status !== "reading";
              if (swapForReread) {
                return (
                  <button
                    key={value}
                    onClick={onReread}
                    disabled={rereadLoading}
                    className="hero-status-pill disabled:opacity-50"
                  >
                    {rereadLoading ? "starting..." : "↺ re-read"}
                  </button>
                );
              }
              return (
                <button
                  key={value}
                  onClick={() => onStatusChange(value)}
                  className="hero-status-pill"
                  style={statusActiveStyle(entry.status, value)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mb-3.5">
            <StarRating
              rating={entry.rating}
              onChange={(r) => onUpdate({ rating: r })}
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {[
              ...entry.genres,
              ...entry.userGenres.filter((g) => !entry.genres.includes(g)),
            ].map((g) => {
              const isUserGenre = entry.userGenres.includes(g);
              return isUserGenre ? (
                <button
                  key={g}
                  onClick={() =>
                    onUpdate({
                      userGenres: entry.userGenres.filter((x) => x !== g),
                    })
                  }
                  className="hero-genre-chip"
                >
                  {g} ×
                </button>
              ) : (
                <span
                  key={g}
                  className="hero-genre-chip opacity-60 cursor-default"
                >
                  {g}
                </span>
              );
            })}
            <HeroGenreAdd
              genres={[...entry.genres, ...entry.userGenres]}
              onAdd={(g) => onUpdate({ userGenres: [...entry.userGenres, g] })}
            />
          </div>

          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/[0.08]">
            {viewedRead ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="hero-date-label">started</span>
                  <input
                    id={`book-read-${viewedRead.id}-date-started`}
                    type="date"
                    value={viewedRead.dateStarted}
                    max={
                      viewedRead.dateFinished
                        ? addDays(viewedRead.dateFinished, -1)
                        : localDateStr()
                    }
                    onChange={(e) =>
                      onUpdateRead(viewedRead.id, {
                        ...viewedRead,
                        dateStarted: e.target.value,
                      })
                    }
                    className="hero-date-input"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="hero-date-label">finished</span>
                  <input
                    id={`book-read-${viewedRead.id}-date-finished`}
                    type="date"
                    value={viewedRead.dateFinished}
                    min={
                      viewedRead.dateStarted
                        ? addDays(viewedRead.dateStarted, 1)
                        : undefined
                    }
                    max={localDateStr()}
                    onChange={(e) =>
                      onUpdateRead(viewedRead.id, {
                        ...viewedRead,
                        dateFinished: e.target.value,
                      })
                    }
                    className="hero-date-input"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="hero-date-label">started</span>
                  <input
                    id="book-current-date-started"
                    type="date"
                    value={entry.dateStarted}
                    max={
                      entry.dateFinished
                        ? addDays(entry.dateFinished, -1)
                        : localDateStr()
                    }
                    onChange={(e) => onUpdate({ dateStarted: e.target.value })}
                    className="hero-date-input"
                  />
                </div>
                {(entry.status === "finished" || entry.dateFinished) && (
                  <div className="flex items-center gap-1.5">
                    <span className="hero-date-label">finished</span>
                    <input
                      id="book-current-date-finished"
                      type="date"
                      value={entry.dateFinished}
                      min={
                        entry.dateStarted
                          ? addDays(entry.dateStarted, 1)
                          : undefined
                      }
                      max={localDateStr()}
                      onChange={(e) =>
                        onUpdate({ dateFinished: e.target.value })
                      }
                      className="hero-date-input"
                    />
                  </div>
                )}
                {entry.status === "did-not-finish" && (
                  <div className="flex items-center gap-1.5">
                    <span className="hero-date-label">dnf'd</span>
                    <input
                      id="book-current-date-dnfed"
                      type="date"
                      value={entry.dateDnfed}
                      min={entry.dateStarted || undefined}
                      max={localDateStr()}
                      onChange={(e) => onUpdate({ dateDnfed: e.target.value })}
                      className="hero-date-input"
                    />
                  </div>
                )}
                {entry.status !== "did-not-finish" && entry.dateShelved && (
                  <div className="flex items-center gap-1.5">
                    <span className="hero-date-label">shelved</span>
                    <input
                      id="book-current-date-shelved"
                      type="date"
                      value={entry.dateShelved}
                      max={localDateStr()}
                      onChange={(e) =>
                        onUpdate({ dateShelved: e.target.value })
                      }
                      className="hero-date-input"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-3 items-center flex-wrap">
          {(entry.pageCount ?? 0) > 0 && (
            <span className="text-caption text-white/40 font-sans inline-flex items-center gap-1">
              <BookOpenTextIcon size={14} weight="regular" />
              {entry.pageCount} pages
            </span>
          )}
          {quoteCount > 0 && (
            <span className="text-caption text-white/40 font-sans inline-flex items-center gap-1">
              <QuotesIcon size={14} weight="regular" />
              {quoteCount} quote{quoteCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
