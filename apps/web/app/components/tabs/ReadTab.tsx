"use client";

import { useRef, useState, useEffect } from "react";
import { useBook } from "@/providers/BookContext";
import { MoodChip } from "@/components/MoodChip";
import { QuoteCard } from "@/components/QuoteCard";
import { StarDisplay } from "@/components/StarDisplay";
import { MOOD_TAGS } from "@/lib/constants";
import { formatDate, daysApart, localDateStr } from "@/lib/dates";
import { avgPagesPerDay } from "@/lib/books";
import type { BookEntry } from "@/types";

type HistoricalRead = BookEntry["reads"][number];

// ─── Tab: per-read (current or historical) ────────────────────────

export default function ReadTab({
  read,
}: {
  /** undefined = current (user_books) state; defined = historical book_read */
  read?: HistoricalRead;
}) {
  const {
    entry,
    quotes,
    setActiveTab,
    onUpdate,
    onUpdateRead,
    onDeleteRead,
    onReread,
    rereadLoading,
    onLogRead,
  } = useBook();

  const isCurrent = !read;
  const feelingRef = useRef<HTMLTextAreaElement>(null);

  // Draft state for historical read edits
  const [draft, setDraft] = useState(() =>
    read
      ? {
          dateStarted: read.dateStarted,
          dateFinished: read.dateFinished,
          rating: read.rating,
          feeling: read.feeling,
        }
      : null,
  );
  const [saving, setSaving] = useState(false);

  // Log-past-read form (current tab only)
  const [showLogForm, setShowLogForm] = useState(false);
  const [logDraft, setLogDraft] = useState({
    dateStarted: "",
    dateFinished: "",
    rating: 0,
    feeling: "",
  });
  const [logSaving, setLogSaving] = useState(false);

  useEffect(() => {
    if (!feelingRef.current) return;
    feelingRef.current.style.height = "auto";
    feelingRef.current.style.height = feelingRef.current.scrollHeight + "px";
  });

  const handleSaveHistorical = async () => {
    if (!read || !draft || saving) return;
    setSaving(true);
    try {
      await onUpdateRead(read.id, { ...draft, status: "finished" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogSubmit = async () => {
    if (logSaving) return;
    setLogSaving(true);
    try {
      await onLogRead(logDraft);
      setLogDraft({
        dateStarted: "",
        dateFinished: "",
        rating: 0,
        feeling: "",
      });
      setShowLogForm(false);
    } finally {
      setLogSaving(false);
    }
  };

  // ── Historical read tab ──────────────────────────────────────────
  if (!isCurrent && read && draft) {
    return (
      <div className="px-4 sm:px-10 py-5 sm:py-7 bg-cream">
        <div className="grid gap-5 sm:gap-7 md:grid-cols-[2fr_1fr]">
          {/* Left: reflection */}
          <div className="book-surface p-4 sm:p-6">
            <p className="caveat-label mb-3">my reflection</p>
            <div
              className="journal-surface p-3 sm:p-5"
              style={{ minHeight: "160px" }}
            >
              <textarea
                id="read-tab-feeling"
                ref={feelingRef}
                value={draft.feeling}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, feeling: e.target.value } : d))
                }
                placeholder="how did this read go?"
                rows={6}
                className="journal-text w-full bg-transparent border-none outline-none resize-none"
              />
            </div>
          </div>

          {/* Right: rating, dates, actions */}
          <div className="flex flex-col gap-3.5">
            <div className="book-surface p-5">
              <p className="caveat-label mb-3">rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      setDraft((d) =>
                        d ? { ...d, rating: d.rating === n ? 0 : n } : d,
                      )
                    }
                    className={`text-lg transition-colors ${
                      n <= draft.rating
                        ? "text-gold"
                        : "text-stone-200 hover:text-stone-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="book-surface p-5">
              <p className="caveat-label mb-3">dates</p>
              <div className="space-y-2.5">
                <div>
                  <label className="text-label uppercase tracking-widest text-fg-muted font-semibold block mb-0.5">
                    Started
                  </label>
                  <input
                    id="read-tab-date-started"
                    type="date"
                    value={draft.dateStarted}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, dateStarted: e.target.value } : d,
                      )
                    }
                    className="text-caption bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-fg"
                  />
                </div>
                <div>
                  <label className="text-label uppercase tracking-widest text-fg-muted font-semibold block mb-0.5">
                    Finished
                  </label>
                  <input
                    id="read-tab-date-finished"
                    type="date"
                    value={draft.dateFinished}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, dateFinished: e.target.value } : d,
                      )
                    }
                    className="text-caption bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-fg"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveHistorical}
                disabled={saving}
                className="text-xs text-white bg-plum px-4 py-2 rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity font-sans"
              >
                {saving ? "saving..." : "save changes"}
              </button>
              <button
                onClick={() => onDeleteRead(read.id)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors font-sans"
              >
                delete this read
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Current read tab ─────────────────────────────────────────────
  const pace = avgPagesPerDay(entry);
  const previewQuotes = quotes.slice(0, 2);

  const metaRows = [
    { key: "Pages", val: entry.pageCount ? String(entry.pageCount) : "—" },
    ...(entry.releaseDate
      ? [
          {
            key: "Published",
            val: new Date(entry.releaseDate).getFullYear(),
          },
        ]
      : []),
    ...(entry.genres.length ? [{ key: "Genre", val: entry.genres[0] }] : []),
    ...(entry.dateStarted
      ? [{ key: "Started", val: formatDate(entry.dateStarted) }]
      : []),
    ...(entry.dateFinished
      ? [{ key: "Finished", val: formatDate(entry.dateFinished) }]
      : []),
    ...(entry.dateStarted && (entry.dateFinished || entry.status === "reading")
      ? [
          {
            key: "Days reading",
            val:
              daysApart(
                entry.dateStarted,
                entry.dateFinished || localDateStr(),
              ) + 1,
          },
        ]
      : []),
    ...(pace !== null ? [{ key: "Avg pages/day", val: pace }] : []),
    ...(entry.rating > 0 ? [{ key: "Rating", val: null, isRating: true }] : []),
  ] as { key: string; val: string | number; isRating?: boolean }[];

  return (
    <div className="grid gap-5 sm:gap-7 px-4 sm:px-10 py-5 sm:py-7 bg-cream md:grid-cols-[2fr_1fr]">
      {/* Left column */}
      <div>
        {/* Reflection */}
        <div className="book-surface p-6 mb-4">
          <p className="caveat-label mb-3">my reflection</p>
          <div className="journal-surface p-5" style={{ minHeight: "160px" }}>
            <textarea
              id="read-tab-feeling-current"
              ref={feelingRef}
              value={entry.feeling}
              onChange={(e) => onUpdate({ feeling: e.target.value })}
              placeholder="how did this book make you feel? what will you carry with you?"
              rows={6}
              className="journal-text w-full bg-transparent border-none outline-none resize-none"
            />
          </div>
        </div>

        {/* Mood tags */}
        <div className="book-surface p-6 mb-4">
          <p className="caveat-label mb-2.5">how it made me feel</p>
          <div className="flex flex-wrap gap-2">
            {MOOD_TAGS.map((tag) => (
              <MoodChip
                key={tag}
                mood={tag}
                active={entry.moodTags.includes(tag)}
                onClick={() =>
                  onUpdate({
                    moodTags: entry.moodTags.includes(tag)
                      ? entry.moodTags.filter((t) => t !== tag)
                      : [...entry.moodTags, tag],
                  })
                }
              />
            ))}
          </div>
        </div>

        {/* Quotes preview */}
        <div className="book-surface p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="caveat-label">favorite quotes</span>
            <button
              onClick={() => setActiveTab("quotes")}
              className="text-caption text-terra font-semibold font-sans bg-transparent border-none cursor-pointer"
            >
              {quotes.length > 2
                ? `see all ${quotes.length} →`
                : "+ add quote →"}
            </button>
          </div>
          {previewQuotes.length > 0 ? (
            <div className="space-y-3">
              {previewQuotes.map((q) => (
                <QuoteCard key={q.id} text={q.text} pageNumber={q.pageNumber} />
              ))}
            </div>
          ) : (
            <p className="font-hand text-note text-fg-faint">
              no quotes saved yet
            </p>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div>
        {/* Book details */}
        <div className="book-surface p-5 mb-3.5">
          <p className="book-card-heading text-body-md">Book details</p>
          {metaRows.map((row) => (
            <div key={row.key} className="meta-row">
              <span className="text-fg-muted font-medium font-sans">
                {row.key}
              </span>
              {row.isRating ? (
                <StarDisplay rating={entry.rating} size={12} />
              ) : (
                <span className="text-fg-heading font-semibold font-sans">
                  {row.val}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Reading sessions count */}
        {entry.thoughts.length > 0 && (
          <div className="book-surface p-5 mb-3.5">
            <p className="font-sans text-caption font-bold tracking-caps uppercase text-fg-muted mb-2.5">
              Reading sessions
            </p>
            <p className="font-serif text-display font-bold text-fg-heading">
              {entry.thoughts.length}
            </p>
            <p className="font-hand text-xs text-terra mt-0.5">
              logged entries ✦
            </p>
            <button
              onClick={() => setActiveTab("timeline")}
              className="mt-3 text-caption text-sage font-semibold font-sans bg-sage-18 border-none rounded-full px-3 py-[5px] cursor-pointer"
            >
              view timeline →
            </button>
          </div>
        )}

        {/* Re-read controls */}
        {(entry.status === "finished" || entry.status === "did-not-finish") && (
          <div className="book-surface p-5">
            <p className="book-card-heading text-sm">Re-reads</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <button
                  onClick={onReread}
                  disabled={rereadLoading}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50"
                >
                  {rereadLoading ? "starting..." : "↺ start a re-read"}
                </button>
                <button
                  onClick={() => setShowLogForm((v) => !v)}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                >
                  + log a past read
                </button>
              </div>

              {showLogForm && (
                <div className="mt-1 space-y-2 border-t border-stone-100 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-label uppercase tracking-widest text-fg-muted font-semibold block mb-0.5">
                        Started
                      </label>
                      <input
                        id="read-tab-log-date-started"
                        type="date"
                        value={logDraft.dateStarted}
                        onChange={(e) =>
                          setLogDraft((d) => ({
                            ...d,
                            dateStarted: e.target.value,
                          }))
                        }
                        className="text-caption bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-fg"
                      />
                    </div>
                    <div>
                      <label className="text-label uppercase tracking-widest text-fg-muted font-semibold block mb-0.5">
                        Finished
                      </label>
                      <input
                        id="read-tab-log-date-finished"
                        type="date"
                        value={logDraft.dateFinished}
                        onChange={(e) =>
                          setLogDraft((d) => ({
                            ...d,
                            dateFinished: e.target.value,
                          }))
                        }
                        className="text-caption bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-fg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-label uppercase tracking-widest text-fg-muted font-semibold block mb-1">
                      Rating
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() =>
                            setLogDraft((d) => ({
                              ...d,
                              rating: d.rating === n ? 0 : n,
                            }))
                          }
                          className={`text-sm transition-colors ${
                            n <= logDraft.rating
                              ? "text-gold"
                              : "text-stone-200 hover:text-stone-300"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-label uppercase tracking-widest text-fg-muted font-semibold block mb-0.5">
                      Notes
                    </label>
                    <input
                      id="read-tab-log-feeling"
                      type="text"
                      value={logDraft.feeling}
                      onChange={(e) =>
                        setLogDraft((d) => ({
                          ...d,
                          feeling: e.target.value,
                        }))
                      }
                      placeholder="a quick note..."
                      className="text-caption bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 placeholder:text-stone-300 text-fg"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleLogSubmit}
                      disabled={
                        logSaving ||
                        (!logDraft.dateFinished && !logDraft.dateStarted)
                      }
                      className="text-xs text-white bg-plum px-3 py-1 rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
                    >
                      {logSaving ? "saving..." : "save"}
                    </button>
                    <button
                      onClick={() => {
                        setShowLogForm(false);
                        setLogDraft({
                          dateStarted: "",
                          dateFinished: "",
                          rating: 0,
                          feeling: "",
                        });
                      }}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
