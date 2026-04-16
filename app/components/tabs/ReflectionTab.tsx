import { useRef, useState, useEffect } from "react";
import { MoodChip } from "@/components/MoodChip";
import { QuoteCard } from "@/components/QuoteCard";
import { StarDisplay } from "@/components/StarDisplay";
import { MOOD_TAGS } from "@/lib/constants";
import {
  formatDate,
  daysApart,
  localDateStr,
  dateYear,
  formatShortDate,
} from "@/lib/dates";
import { BookEntry, Quote, ReadingStatus } from "@/types";
import { TabId, avgPagesPerDay } from "@/lib/books";

// ─── Tab: Reflection ──────────────────────────────────────────────

export default function ReflectionTab({
  entry,
  quotes,
  onUpdate,
  onTabChange,
  onReread,
  rereadLoading,
  onDeleteRead,
  onLogRead,
  onUpdateRead,
}: {
  entry: BookEntry;
  quotes: Quote[];
  onUpdate: (patch: Partial<BookEntry>) => void;
  onTabChange: (tab: TabId) => void;
  onReread: () => void;
  rereadLoading: boolean;
  onDeleteRead: (id: string) => void;
  onLogRead: (read: {
    status: string;
    dateStarted: string;
    dateFinished: string;
    rating: number;
    feeling: string;
  }) => Promise<void>;
  onUpdateRead: (
    readId: string,
    patch: {
      status: ReadingStatus;
      dateStarted: string;
      dateFinished: string;
      rating: number;
      feeling: string;
    },
  ) => Promise<void>;
}) {
  const feelingRef = useRef<HTMLTextAreaElement>(null);
  const pace = avgPagesPerDay(entry);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logDraft, setLogDraft] = useState({
    dateStarted: "",
    dateFinished: "",
    rating: 0,
    feeling: "",
  });
  const [logSaving, setLogSaving] = useState(false);
  const [editingReadId, setEditingReadId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    dateStarted: "",
    dateFinished: "",
    rating: 0,
    feeling: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const startEditing = (read: BookEntry["reads"][number]) => {
    setEditingReadId(read.id);
    setEditDraft({
      dateStarted: read.dateStarted,
      dateFinished: read.dateFinished,
      rating: read.rating,
      feeling: read.feeling,
    });
  };

  const handleEditSubmit = async () => {
    if (!editingReadId || editSaving) return;
    setEditSaving(true);
    try {
      await onUpdateRead(editingReadId, { ...editDraft, status: "finished" });
      setEditingReadId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const handleLogSubmit = async () => {
    if (logSaving) return;
    setLogSaving(true);
    try {
      await onLogRead({ ...logDraft, status: "finished" });
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

  useEffect(() => {
    if (!feelingRef.current) return;
    feelingRef.current.style.height = "auto";
    feelingRef.current.style.height = feelingRef.current.scrollHeight + "px";
  });

  const previewQuotes = quotes.slice(0, 2);

  const metaRows = [
    { key: "Pages", val: entry.pageCount ? String(entry.pageCount) : "—" },
    ...(entry.releaseDate
      ? [{ key: "Published", val: new Date(entry.releaseDate).getFullYear() }]
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
    <div
      className="grid gap-7 px-10 py-7 bg-cream"
      style={{ gridTemplateColumns: "2fr 1fr" }}
    >
      {/* Left column */}
      <div>
        {/* Reflection field */}
        <div className="book-surface p-6 mb-4">
          <p className="caveat-label mb-3">my reflection</p>
          <div className="journal-surface p-5" style={{ minHeight: "160px" }}>
            <textarea
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
              onClick={() => onTabChange("quotes")}
              className="text-[11px] text-terra font-semibold font-sans bg-transparent border-none cursor-pointer"
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
            <p className="font-hand text-[13px] text-fg-faint">
              no quotes saved yet
            </p>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div>
        {/* Book details */}
        <div className="book-surface p-5 mb-3.5">
          <p className="book-card-heading text-[15px]">Book details</p>
          {metaRows.map((row) => (
            <div key={row.key} className="meta-row">
              <span className="text-ink-light font-medium font-sans">
                {row.key}
              </span>
              {row.isRating ? (
                <StarDisplay rating={entry.rating} size={12} />
              ) : (
                <span className="text-plum font-semibold font-sans">
                  {row.val}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Reading sessions count */}
        {entry.thoughts.length > 0 && (
          <div className="book-surface p-5 mb-3.5">
            <p className="font-sans text-[11px] font-bold tracking-[0.08em] uppercase text-ink-light mb-2.5">
              Reading sessions
            </p>
            <p className="font-serif text-[28px] font-bold text-plum">
              {entry.thoughts.length}
            </p>
            <p className="font-hand text-xs text-terra mt-0.5">
              logged entries ✦
            </p>
            <button
              onClick={() => onTabChange("timeline")}
              className="mt-3 text-[11px] text-sage font-semibold font-sans bg-[var(--bg-sage-18)] border-none rounded-full px-3 py-[5px] cursor-pointer"
            >
              view timeline →
            </button>
          </div>
        )}

        {/* Re-reads */}
        {(entry.reads.length > 0 ||
          entry.status === "finished" ||
          entry.status === "did-not-finish") && (
          <div className="book-surface p-5">
            <p className="book-card-heading text-sm">Re-reads</p>
            <div className="flex flex-col gap-2.5">
              {[...entry.reads].reverse().map((read, i) => (
                <div key={read.id}>
                  {editingReadId === read.id ? (
                    <div className="space-y-2 border border-stone-200 rounded-lg p-3 bg-stone-50">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-0.5">
                            Started
                          </label>
                          <input
                            type="date"
                            value={editDraft.dateStarted}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                dateStarted: e.target.value,
                              }))
                            }
                            className="text-[11px] bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-[var(--fg)]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-0.5">
                            Finished
                          </label>
                          <input
                            type="date"
                            value={editDraft.dateFinished}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                dateFinished: e.target.value,
                              }))
                            }
                            className="text-[11px] bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-[var(--fg)]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-1">
                          Rating
                        </label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() =>
                                setEditDraft((d) => ({
                                  ...d,
                                  rating: d.rating === n ? 0 : n,
                                }))
                              }
                              className={`text-sm transition-colors ${n <= editDraft.rating ? "text-[var(--gold)]" : "text-stone-200 hover:text-stone-300"}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-0.5">
                          Feelings
                        </label>
                        <input
                          type="text"
                          value={editDraft.feeling}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              feeling: e.target.value,
                            }))
                          }
                          placeholder="a quick note..."
                          className="text-[11px] bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 placeholder:text-stone-300 text-[var(--fg)]"
                        />
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={handleEditSubmit}
                          disabled={editSaving}
                          className="text-xs text-white bg-[var(--plum)] px-3 py-1 rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
                        >
                          {editSaving ? "saving..." : "save"}
                        </button>
                        <button
                          onClick={() => setEditingReadId(null)}
                          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-start justify-between gap-3">
                      <div>
                        <p className="font-sans text-[10px] font-bold tracking-[0.08em] uppercase text-ink-light mb-0.5">
                          Read {entry.reads.length - i}
                          {(read.dateFinished || read.dateStarted) && (
                            <span className="font-normal normal-case tracking-normal ml-1 opacity-60">
                              ·{" "}
                              {dateYear(read.dateFinished || read.dateStarted)}
                            </span>
                          )}
                        </p>
                        <p className="font-hand text-[13px] text-terra">
                          {read.dateStarted
                            ? `${formatShortDate(read.dateStarted)}${read.dateFinished ? ` – ${formatShortDate(read.dateFinished)}` : ""}`
                            : read.dateFinished
                              ? formatShortDate(read.dateFinished)
                              : "—"}
                        </p>
                        {read.rating > 0 && (
                          <StarDisplay rating={read.rating} size={11} />
                        )}
                        {read.feeling && (
                          <p className="font-hand text-xs text-ink-light mt-0.5 leading-snug">
                            {read.feeling}
                          </p>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex gap-1 mt-0.5">
                        <button
                          onClick={() => startEditing(read)}
                          className="w-5 h-5 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 text-[9px] font-bold"
                          title="Edit this read"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => onDeleteRead(read.id)}
                          className="w-5 h-5 flex items-center justify-center rounded-full bg-stone-100 hover:bg-red-100 text-stone-400 hover:text-red-500 text-[11px] font-bold"
                          title="Delete this read"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2">
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
                      <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-0.5">
                        Started
                      </label>
                      <input
                        type="date"
                        value={logDraft.dateStarted}
                        onChange={(e) =>
                          setLogDraft((d) => ({
                            ...d,
                            dateStarted: e.target.value,
                          }))
                        }
                        className="text-[11px] bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-[var(--fg)]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-0.5">
                        Finished
                      </label>
                      <input
                        type="date"
                        value={logDraft.dateFinished}
                        onChange={(e) =>
                          setLogDraft((d) => ({
                            ...d,
                            dateFinished: e.target.value,
                          }))
                        }
                        className="text-[11px] bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-[var(--fg)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-1">
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
                          className={`text-sm transition-colors ${n <= logDraft.rating ? "text-[var(--gold)]" : "text-stone-200 hover:text-stone-300"}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-0.5">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={logDraft.feeling}
                      onChange={(e) =>
                        setLogDraft((d) => ({ ...d, feeling: e.target.value }))
                      }
                      placeholder="a quick note..."
                      className="text-[11px] bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 placeholder:text-stone-300 text-[var(--fg)]"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleLogSubmit}
                      disabled={
                        logSaving ||
                        (!logDraft.dateFinished && !logDraft.dateStarted)
                      }
                      className="text-xs text-white bg-[var(--plum)] px-3 py-1 rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
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
