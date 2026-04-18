import { useRef, useState, useEffect } from "react";
import { MoodChip } from "@/components/MoodChip";
import { QuoteCard } from "@/components/QuoteCard";
import { StarDisplay } from "@/components/StarDisplay";
import { MOOD_TAGS } from "@/lib/constants";
import { formatDate, daysApart, localDateStr } from "@/lib/dates";
import { avgPagesPerDay } from "@/lib/books";
import { useBook } from "@/providers/BookContext";
import type { BookEntry } from "@/types";

// ─── Historical read view (shown when a past read is selected) ────

function HistoricalReadView({
  read,
  readIndex,
}: {
  read: BookEntry["reads"][number];
  readIndex: number;
}) {
  const { onUpdateRead, onDeleteRead } = useBook();
  const feelingRef = useRef<HTMLTextAreaElement>(null);
  const [prevReadId, setPrevReadId] = useState(read.id);
  const [draft, setDraft] = useState({
    dateStarted: read.dateStarted,
    dateFinished: read.dateFinished,
    rating: read.rating,
    feeling: read.feeling,
  });
  const [saving, setSaving] = useState(false);

  // Reset draft when the selected read changes without triggering an effect cycle
  if (prevReadId !== read.id) {
    setPrevReadId(read.id);
    setDraft({
      dateStarted: read.dateStarted,
      dateFinished: read.dateFinished,
      rating: read.rating,
      feeling: read.feeling,
    });
  }

  useEffect(() => {
    if (!feelingRef.current) return;
    feelingRef.current.style.height = "auto";
    feelingRef.current.style.height = feelingRef.current.scrollHeight + "px";
  });

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdateRead(read.id, { ...draft, status: "finished" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="grid gap-7 px-10 py-7 bg-cream"
      style={{ gridTemplateColumns: "2fr 1fr" }}
    >
      {/* Left: reflection */}
      <div>
        <div className="book-surface p-6">
          <p className="caveat-label mb-3">my reflection · read {readIndex}</p>
          <div className="journal-surface p-5" style={{ minHeight: "160px" }}>
            <textarea
              ref={feelingRef}
              value={draft.feeling}
              onChange={(e) =>
                setDraft((d) => ({ ...d, feeling: e.target.value }))
              }
              placeholder="how did this read go?"
              rows={6}
              className="journal-text w-full bg-transparent border-none outline-none resize-none"
            />
          </div>
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
                  setDraft((d) => ({ ...d, rating: d.rating === n ? 0 : n }))
                }
                className={`text-lg transition-colors ${
                  n <= draft.rating
                    ? "text-[var(--gold)]"
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
              <label className="text-[9px] uppercase tracking-widest text-ink-light font-semibold block mb-0.5">
                Started
              </label>
              <input
                type="date"
                value={draft.dateStarted}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, dateStarted: e.target.value }))
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
                value={draft.dateFinished}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, dateFinished: e.target.value }))
                }
                className="text-[11px] bg-transparent border-b border-stone-200 focus:border-plum outline-none w-full pb-0.5 text-[var(--fg)]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs text-white bg-[var(--plum)] px-4 py-2 rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity font-sans"
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
  );
}

// ─── Tab: Reflection ──────────────────────────────────────────────

export default function ReflectionTab() {
  const { entry, quotes, setActiveTab, selectedReadId, onUpdate } = useBook();

  // If a historical read is selected, delegate to HistoricalReadView
  const selectedRead = selectedReadId
    ? (entry.reads.find((r) => r.id === selectedReadId) ?? null)
    : null;

  const feelingRef = useRef<HTMLTextAreaElement>(null);
  const pace = avgPagesPerDay(entry);

  useEffect(() => {
    if (!feelingRef.current) return;
    feelingRef.current.style.height = "auto";
    feelingRef.current.style.height = feelingRef.current.scrollHeight + "px";
  });

  if (selectedRead) {
    return (
      <HistoricalReadView
        read={selectedRead}
        readIndex={entry.reads.indexOf(selectedRead) + 1}
      />
    );
  }

  // ── Current read view ────────────────────────────────────────────
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
              onClick={() => setActiveTab("quotes")}
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
              onClick={() => setActiveTab("timeline")}
              className="mt-3 text-[11px] text-sage font-semibold font-sans bg-[var(--bg-sage-18)] border-none rounded-full px-3 py-[5px] cursor-pointer"
            >
              view timeline →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
