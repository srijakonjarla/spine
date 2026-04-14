"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toggleDay, saveLogNote } from "@/lib/habits";
import { addQuote } from "@/lib/quotes";
import type { BookEntry, BookRead, ReadingLogEntry, Quote } from "@/types";

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-3 text-[var(--fg-faint)]">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BookLink({ id, title, author, rating, meta, onClose }: {
  id: string; title: string; author?: string; rating?: number; meta?: string; onClose: () => void;
}) {
  return (
    <Link href={`/book/${id}`} className="block group" onClick={onClose}>
      <p className="text-[13px] font-medium truncate text-[var(--fg)] group-hover:opacity-70 transition-opacity">{title}</p>
      {author && <p className="text-[11px] mt-0.5 truncate text-[var(--fg-muted)]">{author}</p>}
      {rating != null && rating > 0 && <p className="text-[10px] mt-0.5 text-[var(--gold)]">{"★".repeat(Math.round(rating))}</p>}
      {meta && <p className="text-[10px] mt-0.5 text-[var(--fg-faint)]">{meta}</p>}
    </Link>
  );
}

interface DayPanelProps {
  date: string;
  todayStr: string;
  log: ReadingLogEntry | undefined;
  dayQuotes: Quote[];
  dayFinished: BookEntry[];
  dayStarted: BookEntry[];
  dayReading: BookEntry[];
  dayThoughts: { id: string; text: string; bookTitle: string; bookId: string }[];
  dayBookLog: { bookTitle: string; bookId: string; read: BookRead }[];
  isLogged: boolean;
  onClose: () => void;
  onToggled: (date: string, result: "added" | "removed") => void;
  onNoteSaved: (date: string, note: string) => void;
  onQuoteAdded: (quote: Quote) => void;
}

export function DayPanel({
  date,
  todayStr,
  log,
  dayQuotes,
  dayFinished,
  dayStarted,
  dayReading,
  dayThoughts,
  dayBookLog,
  isLogged,
  onClose,
  onToggled,
  onNoteSaved,
  onQuoteAdded,
}: DayPanelProps) {
  const isToday = date === todayStr;
  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const [localLogged, setLocalLogged] = useState(isLogged);
  const [draft, setDraft] = useState(log?.note ?? "");
  const [editMode, setEditMode] = useState(false);
  const [localQuotes, setLocalQuotes] = useState<Quote[]>(dayQuotes);

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quotePage, setQuotePage] = useState("");
  const [quoteBookId, setQuoteBookId] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quoteRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDayBooks = [...dayFinished, ...dayStarted, ...(isToday ? dayReading : [])];
  const moodTags = Array.from(new Set(activeDayBooks.flatMap((b) => b.moodTags)));

  useEffect(() => {
    setLocalLogged(isLogged);
    setDraft(log?.note ?? "");
    setLocalQuotes(dayQuotes);
    setShowQuoteForm(false);
    setQuoteText("");
    setQuotePage("");
    setQuoteBookId("");

    const hasNote = !!(log?.note?.trim());
    const hasActivity = isLogged || dayQuotes.length > 0 || dayFinished.length > 0;
    const shouldEdit = isToday || !hasActivity || !hasNote;
    setEditMode(shouldEdit);
    if (shouldEdit) setTimeout(() => textareaRef.current?.focus(), 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const scheduleSave = (val: string) => {
    setDraft(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!localLogged && val.trim()) {
        const result = await toggleDay(date);
        setLocalLogged(true);
        onToggled(date, result);
      }
      await saveLogNote(date, val);
      onNoteSaved(date, val);
    }, 800);
  };

  const handleToggleClick = async () => {
    const result = await toggleDay(date);
    const nowLogged = result === "added";
    setLocalLogged(nowLogged);
    onToggled(date, result);
    if (!nowLogged) { setDraft(""); onNoteSaved(date, ""); }
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteText.trim()) return;
    setSavingQuote(true);
    try {
      const q = await addQuote(quoteText.trim(), quoteBookId || undefined, quotePage || undefined);
      setLocalQuotes((prev) => [...prev, q]);
      onQuoteAdded(q);
      setQuoteText(""); setQuotePage(""); setQuoteBookId(""); setShowQuoteForm(false);
    } finally {
      setSavingQuote(false);
    }
  };

  const hasActivity = localLogged || localQuotes.length > 0 || dayFinished.length > 0;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[var(--border-light)]">
        <div>
          {isToday && (
            <p className="text-[9px] uppercase tracking-[0.15em] mb-1 font-semibold text-[var(--sage)]">today</p>
          )}
          <h2 className="font-serif text-[18px] font-semibold leading-tight text-[var(--fg-heading)]">
            {dateLabel}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 text-[22px] leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors text-[var(--fg-muted)]"
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

        {/* Reading day toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--fg-muted)]">Reading day</span>
          <button
            onClick={handleToggleClick}
            className={`text-[11px] px-3 py-1 rounded-full transition-all font-medium border ${
              localLogged
                ? "bg-[var(--bg-sage-pill)] text-[var(--sage)] border-[var(--border-sage)]"
                : "bg-[var(--bg-hover)] text-[var(--fg-muted)] border-[var(--border-light)]"
            }`}
          >
            {localLogged ? "✓ logged" : "mark as reading day"}
          </button>
        </div>

        {/* Journal note — ruled textarea */}
        <div>
          {editMode ? (
            <textarea
              ref={textareaRef}
              value={draft}
              rows={7}
              onChange={(e) => scheduleSave(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape" && !isToday) setEditMode(false); }}
              onBlur={() => { if (!isToday) setEditMode(false); }}
              placeholder={hasActivity ? "add a note for this day..." : "Nothing logged this day — want to add a note?"}
              className="w-full resize-none focus:outline-none text-[13px] leading-[1.75em] bg-transparent text-[var(--fg)] font-serif pb-[1.75em] caret-plum bg-local [background-image:var(--ruled-note-line)]"
            />
          ) : draft ? (
            <div
              className="cursor-text -mx-1 px-1 py-1 rounded-lg hover:bg-[var(--bg-faintest)] transition-colors"
              onClick={() => { setEditMode(true); setTimeout(() => textareaRef.current?.focus(), 10); }}
            >
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--fg)] font-serif">
                {draft}
              </p>
            </div>
          ) : (
            <button
              className="text-left text-[13px] italic text-[var(--fg-faint)] font-serif"
              onClick={() => { setEditMode(true); setTimeout(() => textareaRef.current?.focus(), 10); }}
            >
              Nothing logged this day — want to add a note?
            </button>
          )}
        </div>

        {/* Mood tags */}
        {moodTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {moodTags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-muted-tag)] text-[var(--fg-muted)]">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Books finished on this day */}
        {dayFinished.length > 0 && (
          <PanelSection label="finished">
            {dayFinished.map((b) => (
              <BookLink key={b.id} id={b.id} title={b.title} author={b.author} rating={b.rating} onClose={onClose} />
            ))}
          </PanelSection>
        )}

        {/* Books started on this day */}
        {dayStarted.length > 0 && (
          <PanelSection label="started">
            {dayStarted.map((b) => (
              <BookLink key={b.id} id={b.id} title={b.title} author={b.author} onClose={onClose} />
            ))}
          </PanelSection>
        )}

        {/* Currently reading (today only) */}
        {isToday && dayReading.length > 0 && (
          <PanelSection label="reading now">
            {dayReading.map((b) => (
              <BookLink key={b.id} id={b.id} title={b.title} author={b.author} onClose={onClose} />
            ))}
          </PanelSection>
        )}

        {/* Book log entries added on this day */}
        {dayBookLog.length > 0 && (
          <PanelSection label="book log">
            {dayBookLog.map(({ bookTitle, bookId, read }) => {
              const status = read.status === "finished" ? "finished" : read.status === "did-not-finish" ? "shelved" : "started";
              const dates = [
                read.dateStarted && `started ${read.dateStarted}`,
                read.dateFinished && `finished ${read.dateFinished}`,
              ].filter(Boolean).join(" · ");
              const stars = read.rating > 0 ? "★".repeat(Math.round(read.rating)) : "";
              const meta = [status, dates, stars].filter(Boolean).join(" · ");
              return (
                <BookLink key={read.id} id={bookId} title={bookTitle} meta={meta} onClose={onClose} />
              );
            })}
          </PanelSection>
        )}

        {/* Quotes saved on this day */}
        {localQuotes.length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-3 text-[var(--fg-faint)]">quotes ✦</p>
            <div className="space-y-4">
              {localQuotes.map((q) => (
                <div key={q.id} className="pl-3 border-l-2 border-l-[var(--lavender)]">
                  <p className="text-[13px] italic leading-relaxed text-[var(--fg)] font-serif">&ldquo;{q.text}&rdquo;</p>
                  {(q.bookTitle || q.pageNumber) && (
                    <p className="text-[10px] mt-1.5 text-[var(--fg-faint)]">
                      {q.bookTitle}{q.pageNumber ? ` · p. ${q.pageNumber}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thoughts added to books on this day */}
        {dayThoughts.length > 0 && (
          <PanelSection label="reflections">
            {dayThoughts.map((t) => (
              <div key={t.id}>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--fg)] font-serif">{t.text}</p>
                <Link
                  href={`/book/${t.bookId}`}
                  className="text-[10px] mt-1 block hover:opacity-70 transition-opacity text-[var(--fg-faint)]"
                  onClick={onClose}
                >
                  {t.bookTitle}
                </Link>
              </div>
            ))}
          </PanelSection>
        )}

        {/* Save a quote */}
        {!showQuoteForm ? (
          <button
            onClick={() => { setShowQuoteForm(true); setTimeout(() => quoteRef.current?.focus(), 40); }}
            className="text-[11px] font-medium flex items-center gap-1.5 transition-opacity hover:opacity-60 text-[var(--fg-faint)]"
          >
            <span className="text-[var(--gold)]">✦</span> save a quote
          </button>
        ) : (
          <form onSubmit={handleSaveQuote} className="space-y-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[var(--fg-faint)]">save a quote</p>
            <textarea
              ref={quoteRef}
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setShowQuoteForm(false); setQuoteText(""); } }}
              rows={4}
              placeholder="type the quote here..."
              className="w-full resize-none focus:outline-none text-[13px] leading-relaxed rounded-lg px-3 py-2.5 border border-[var(--border-light)] bg-[var(--bg-page)] text-[var(--fg)] font-serif italic"
            />
            <div className="flex gap-2">
              {activeDayBooks.length > 0 && (
                <select
                  value={quoteBookId}
                  onChange={(e) => setQuoteBookId(e.target.value)}
                  className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-[var(--border-light)] focus:outline-none bg-[var(--bg-page)] text-[var(--fg-muted)]"
                >
                  <option value="">no book</option>
                  {activeDayBooks.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={quotePage}
                onChange={(e) => setQuotePage(e.target.value)}
                placeholder="p."
                className="w-14 text-[11px] px-2.5 py-1.5 rounded-lg border border-[var(--border-light)] focus:outline-none text-center bg-[var(--bg-page)] text-[var(--fg-muted)]"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!quoteText.trim() || savingQuote}
                className="text-[11px] font-semibold px-4 py-1.5 rounded-full transition-opacity disabled:opacity-40 bg-[var(--bg-gold-pill)] text-[var(--gold)] border border-[var(--border-gold)]"
              >
                {savingQuote ? "saving…" : "save ✦"}
              </button>
              <button
                type="button"
                onClick={() => { setShowQuoteForm(false); setQuoteText(""); setQuotePage(""); setQuoteBookId(""); }}
                className="text-[11px] transition-opacity hover:opacity-60 text-[var(--fg-faint)]"
              >
                cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
