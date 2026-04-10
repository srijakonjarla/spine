"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog, toggleDay, saveLogNote } from "@/lib/habits";
import { getQuotes, addQuote } from "@/lib/quotes";
import type { BookEntry, ReadingLogEntry, Quote } from "@/types";

const MONTH_ABBRS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function computeStreaks(loggedDates: Set<string>): Set<string> {
  const streakDates = new Set<string>();
  const sorted = Array.from(loggedDates).sort();
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    const prev = new Date(d); prev.setDate(prev.getDate() - 1);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    if (loggedDates.has(prev.toISOString().slice(0, 10)) || loggedDates.has(next.toISOString().slice(0, 10))) {
      streakDates.add(sorted[i]);
    }
  }
  return streakDates;
}

function DayPanel({
  date,
  todayStr,
  log,
  dayQuotes,
  dayFinished,
  dayStarted,
  dayReading,
  dayThoughts,
  isLogged,
  onClose,
  onToggled,
  onNoteSaved,
  onQuoteAdded,
}: {
  date: string;
  todayStr: string;
  log: ReadingLogEntry | undefined;
  dayQuotes: Quote[];
  dayFinished: BookEntry[];
  dayStarted: BookEntry[];
  dayReading: BookEntry[]; // currently reading (used for today context)
  dayThoughts: { id: string; text: string; bookTitle: string; bookId: string }[];
  isLogged: boolean;
  onClose: () => void;
  onToggled: (date: string, result: "added" | "removed") => void;
  onNoteSaved: (date: string, note: string) => void;
  onQuoteAdded: (quote: Quote) => void;
}) {
  const isToday = date === todayStr;
  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const [localLogged, setLocalLogged] = useState(isLogged);
  const [draft, setDraft] = useState(log?.note ?? "");
  const [editMode, setEditMode] = useState(false);
  const [localQuotes, setLocalQuotes] = useState<Quote[]>(dayQuotes);

  // Quote form
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quotePage, setQuotePage] = useState("");
  const [quoteBookId, setQuoteBookId] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quoteRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // All books active on or around this day (for mood tags + quote association)
  const activeDayBooks = [
    ...dayFinished,
    ...dayStarted,
    ...(isToday ? dayReading : []),
  ];
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
    if (shouldEdit) {
      setTimeout(() => textareaRef.current?.focus(), 60);
    }
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
    if (!nowLogged) {
      setDraft("");
      onNoteSaved(date, "");
    }
  };

  const handleSaveQuote = async () => {
    if (!quoteText.trim()) return;
    setSavingQuote(true);
    try {
      const q = await addQuote(quoteText.trim(), quoteBookId || undefined, quotePage || undefined);
      setLocalQuotes((prev) => [...prev, q]);
      onQuoteAdded(q);
      setQuoteText("");
      setQuotePage("");
      setQuoteBookId("");
      setShowQuoteForm(false);
    } finally {
      setSavingQuote(false);
    }
  };

  const hasActivity = localLogged || localQuotes.length > 0 || dayFinished.length > 0;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg-surface)" }}>
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: "var(--border-light)" }}>
        <div>
          {isToday && (
            <p className="text-[9px] uppercase tracking-[0.15em] mb-1 font-semibold" style={{ color: "#7B9E87" }}>today</p>
          )}
          <h2 className="font-[family-name:var(--font-playfair)] text-[18px] font-semibold leading-tight" style={{ color: "var(--fg-heading)" }}>
            {dateLabel}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 text-[22px] leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-[rgba(45,27,46,0.06)] transition-colors"
          style={{ color: "var(--fg-muted)" }}
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

        {/* Reading day toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--fg-muted)" }}>Reading day</span>
          <button
            onClick={handleToggleClick}
            className="text-[11px] px-3 py-1 rounded-full transition-all font-medium"
            style={localLogged
              ? { background: "rgba(123,158,135,0.18)", color: "#7B9E87", border: "1px solid rgba(123,158,135,0.3)" }
              : { background: "var(--bg-hover)", color: "var(--fg-muted)", border: "1px solid var(--border-light)" }
            }
          >
            {localLogged ? "✓ logged" : "mark as reading day"}
          </button>
        </div>

        {/* Journal note — dotted-grid textarea */}
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
              className="w-full resize-none focus:outline-none text-[13px] leading-[1.75em]"
              style={{
                background: "transparent",
                color: "var(--fg)",
                fontFamily: "var(--font-playfair), Georgia, serif",
                caretColor: "var(--plum, #2D1B2E)",
                backgroundImage: "repeating-linear-gradient(transparent, transparent calc(1.75em - 1px), rgba(45,27,46,0.07) calc(1.75em - 1px), rgba(45,27,46,0.07) 1.75em)",
                backgroundAttachment: "local",
                paddingBottom: "1.75em",
              }}
            />
          ) : draft ? (
            <div
              className="cursor-text -mx-1 px-1 py-1 rounded-lg hover:bg-[rgba(45,27,46,0.03)] transition-colors"
              onClick={() => { setEditMode(true); setTimeout(() => textareaRef.current?.focus(), 10); }}
            >
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--fg)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                {draft}
              </p>
            </div>
          ) : (
            <button
              className="text-left text-[13px] italic"
              style={{ color: "var(--fg-faint)", fontFamily: "var(--font-playfair), Georgia, serif" }}
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
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(45,27,46,0.07)", color: "var(--fg-muted)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Books finished on this day */}
        {dayFinished.length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-3" style={{ color: "var(--fg-faint)" }}>finished</p>
            <div className="space-y-3">
              {dayFinished.map((b) => (
                <Link key={b.id} href={`/book/${b.id}`} className="block group" onClick={onClose}>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>{b.title}</p>
                    {b.author && <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>{b.author}</p>}
                    {b.rating > 0 && <p className="text-[10px] mt-0.5" style={{ color: "#D4A843" }}>{"★".repeat(Math.round(b.rating))}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Books started on this day */}
        {dayStarted.length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-3" style={{ color: "var(--fg-faint)" }}>started</p>
            <div className="space-y-3">
              {dayStarted.map((b) => (
                <Link key={b.id} href={`/book/${b.id}`} className="block group" onClick={onClose}>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>{b.title}</p>
                    {b.author && <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>{b.author}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Currently reading (today only) */}
        {isToday && dayReading.length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-3" style={{ color: "var(--fg-faint)" }}>reading now</p>
            <div className="space-y-3">
              {dayReading.map((b) => (
                <Link key={b.id} href={`/book/${b.id}`} className="block group" onClick={onClose}>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>{b.title}</p>
                    {b.author && <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>{b.author}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quotes saved on this day */}
        {localQuotes.length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-3" style={{ color: "var(--fg-faint)" }}>quotes ✦</p>
            <div className="space-y-4">
              {localQuotes.map((q) => (
                <div key={q.id} className="pl-3" style={{ borderLeft: "2px solid var(--lavender, #b5a9c9)" }}>
                  <p className="text-[13px] italic leading-relaxed" style={{ color: "var(--fg)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                    "{q.text}"
                  </p>
                  {(q.bookTitle || q.pageNumber) && (
                    <p className="text-[10px] mt-1.5" style={{ color: "var(--fg-faint)" }}>
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
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-3" style={{ color: "var(--fg-faint)" }}>
              reflections
            </p>
            <div className="space-y-3">
              {dayThoughts.map((t) => (
                <div key={t.id}>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--fg)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                    {t.text}
                  </p>
                  <Link
                    href={`/book/${t.bookId}`}
                    className="text-[10px] mt-1 block hover:opacity-70 transition-opacity"
                    style={{ color: "var(--fg-faint)" }}
                    onClick={onClose}
                  >
                    {t.bookTitle}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save a quote */}
        {!showQuoteForm ? (
          <button
            onClick={() => {
              setShowQuoteForm(true);
              setTimeout(() => quoteRef.current?.focus(), 40);
            }}
            className="text-[11px] font-medium flex items-center gap-1.5 transition-opacity hover:opacity-60"
            style={{ color: "var(--fg-faint)" }}
          >
            <span style={{ color: "#D4A843" }}>✦</span> save a quote
          </button>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--fg-faint)" }}>save a quote</p>
            <textarea
              ref={quoteRef}
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setShowQuoteForm(false); setQuoteText(""); }
              }}
              rows={4}
              placeholder="type the quote here..."
              className="w-full resize-none focus:outline-none text-[13px] leading-relaxed rounded-lg px-3 py-2.5 border"
              style={{
                background: "var(--bg-page)",
                color: "var(--fg)",
                fontFamily: "var(--font-playfair), Georgia, serif",
                borderColor: "var(--border-light)",
                fontStyle: "italic",
              }}
            />
            <div className="flex gap-2">
              {activeDayBooks.length > 0 && (
                <select
                  value={quoteBookId}
                  onChange={(e) => setQuoteBookId(e.target.value)}
                  className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg border focus:outline-none"
                  style={{ background: "var(--bg-page)", color: "var(--fg-muted)", borderColor: "var(--border-light)" }}
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
                className="w-14 text-[11px] px-2.5 py-1.5 rounded-lg border focus:outline-none text-center"
                style={{ background: "var(--bg-page)", color: "var(--fg-muted)", borderColor: "var(--border-light)" }}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveQuote}
                disabled={!quoteText.trim() || savingQuote}
                className="text-[11px] font-semibold px-4 py-1.5 rounded-full transition-opacity disabled:opacity-40"
                style={{ background: "rgba(212,168,67,0.15)", color: "#D4A843", border: "1px solid rgba(212,168,67,0.3)" }}
              >
                {savingQuote ? "saving…" : "save ✦"}
              </button>
              <button
                onClick={() => { setShowQuoteForm(false); setQuoteText(""); setQuotePage(""); setQuoteBookId(""); }}
                className="text-[11px] transition-opacity hover:opacity-60"
                style={{ color: "var(--fg-faint)" }}
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonthSpreadPage() {
  const { year: yearParam, month: monthParam } = useParams<{ year: string; month: string }>();
  const router = useRouter();

  const year = Number(yearParam);
  const monthIndex = Math.max(0, MONTH_ABBRS.indexOf(monthParam.toLowerCase()));

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const [allBooks, setAllBooks] = useState<BookEntry[]>([]);
  const [reading, setReading] = useState<BookEntry[]>([]);
  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(null);
    Promise.all([getEntries(), getReadingLog(year), getQuotes()])
      .then(([books, log, qs]) => {
        setAllBooks(books);
        setReading(books.filter((b) => b.status === "reading"));
        setLogEntries(log as ReadingLogEntry[]);
        setQuotes(qs);
      })
      .catch(console.error);
  }, [year]);

  const monthKey = `${year}-${pad(monthIndex + 1)}`;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const isCurrentMonth = year === now.getFullYear() && monthIndex === now.getMonth();

  const loggedDates = new Set(logEntries.map((e) => e.logDate));
  const loggedThisMonth = new Set(logEntries.map((e) => e.logDate).filter((d) => d.startsWith(monthKey)));
  const streakDates = computeStreaks(loggedDates);

  const finishedByDate = new Map<string, BookEntry>();
  allBooks.forEach((b) => {
    if ((b.status === "finished" || b.status === "did-not-finish") && b.dateFinished?.startsWith(monthKey)) {
      finishedByDate.set(b.dateFinished, b);
    }
  });

  const quoteDateSet = new Set(quotes.map((q) => q.createdAt.slice(0, 10)).filter((d) => d.startsWith(monthKey)));

  const cells: { day: number | null; dateStr: string }[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, dateStr: "" });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dateStr: `${monthKey}-${pad(d)}` });

  const finishedThisMonth = allBooks.filter(
    (b) => (b.status === "finished" || b.status === "did-not-finish") &&
      (b.dateFinished?.startsWith(monthKey) || b.dateShelved?.startsWith(monthKey))
  );
  const quotesThisMonth = quotes.filter((q) => q.createdAt.startsWith(monthKey));
  const daysRead = loggedThisMonth.size;

  const currentStreak = (() => {
    let streak = 0;
    const d = new Date(todayStr);
    while (loggedDates.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  const monthLabel = new Date(year, monthIndex).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goToMonth = (y: number, m: number) => {
    const newYear = m < 0 ? y - 1 : m > 11 ? y + 1 : y;
    const newMonth = m < 0 ? 11 : m > 11 ? 0 : m;
    router.push(`/${newYear}/${MONTH_ABBRS[newMonth]}`);
  };

  const handleToggled = (date: string, result: "added" | "removed") => {
    setLogEntries((prev) => {
      if (result === "added") {
        if (prev.some((e) => e.logDate === date)) return prev;
        return [...prev, { id: crypto.randomUUID(), logDate: date, note: "" }];
      }
      return prev.filter((e) => e.logDate !== date);
    });
  };

  const handleNoteSaved = (date: string, note: string) => {
    setLogEntries((prev) => prev.map((e) => (e.logDate === date ? { ...e, note } : e)));
  };

  const handleQuoteAdded = (q: Quote) => {
    setQuotes((prev) => [...prev, q]);
  };

  const panelLog = selectedDate ? logEntries.find((e) => e.logDate === selectedDate) : undefined;
  const panelQuotes = selectedDate ? quotes.filter((q) => q.createdAt.slice(0, 10) === selectedDate) : [];
  const panelFinished = selectedDate ? allBooks.filter((b) => b.dateFinished === selectedDate || b.dateShelved === selectedDate) : [];
  const panelStarted = selectedDate ? allBooks.filter((b) => b.dateStarted === selectedDate && b.dateFinished !== selectedDate && b.dateShelved !== selectedDate) : [];
  const panelReading = selectedDate === todayStr ? reading : [];
  const panelThoughts = selectedDate
    ? allBooks.flatMap((b) =>
        b.thoughts
          .filter((t) => t.createdAt.slice(0, 10) === selectedDate)
          .map((t) => ({ id: t.id, text: t.text, bookTitle: b.title, bookId: b.id }))
      )
    : [];
  const panelIsLogged = selectedDate ? loggedDates.has(selectedDate) : false;
  const panelOpen = selectedDate !== null;

  return (
    <div className="page">
      <div className="page-content" style={{ maxWidth: "56rem" }}>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--fg-faint)" }}>
              reading journal · {year}
            </p>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
              {monthLabel}
            </h1>
            <p className="text-xs mt-2" style={{ color: "var(--fg-muted)" }}>
              {finishedThisMonth.length > 0 && `${finishedThisMonth.length} books finished`}
              {daysRead > 0 && ` · ${daysRead} days read`}
              {currentStreak >= 3 && ` · ${currentStreak}-day streak 🔥`}
              {quotesThisMonth.length > 0 && ` · ${quotesThisMonth.length} quotes`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => goToMonth(year, monthIndex - 1)}
              className="text-sm px-2 py-1 rounded hover:bg-[rgba(45,27,46,0.06)] transition-colors"
              style={{ color: "var(--fg-muted)" }}
            >
              ←
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => goToMonth(now.getFullYear(), now.getMonth())}
                className="text-xs px-2 py-1 rounded"
                style={{ color: "var(--fg-faint)" }}
              >
                today
              </button>
            )}
            <button
              onClick={() => goToMonth(year, monthIndex + 1)}
              className="text-sm px-2 py-1 rounded hover:bg-[rgba(45,27,46,0.06)] transition-colors"
              style={{ color: "var(--fg-muted)" }}
            >
              →
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-10 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
          <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border-light)", background: "var(--bg-surface)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center py-2 text-[10px] uppercase tracking-wider" style={{ color: "var(--fg-faint)" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ background: "var(--bg-page)" }}>
            {cells.map((cell, i) => {
              if (!cell.day) {
                return <div key={i} className="aspect-square border-r border-b" style={{ borderColor: "var(--border-light)", opacity: 0.3 }} />;
              }

              const { dateStr } = cell;
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const isLogged = loggedThisMonth.has(dateStr);
              const isStreak = streakDates.has(dateStr);
              const finished = finishedByDate.get(dateStr);
              const hasQuote = quoteDateSet.has(dateStr);
              const isSelected = selectedDate === dateStr;

              let bg = "transparent";
              const textColor = isFuture ? "var(--fg-faint)" : isToday ? "#fff" : "var(--fg)";
              if (isSelected) bg = "rgba(45,27,46,0.12)";
              else if (isToday) bg = "var(--plum)";
              else if (finished) bg = "rgba(201,123,90,0.15)";
              else if (isStreak && isLogged) bg = "rgba(123,158,135,0.18)";
              else if (isLogged) bg = "rgba(123,158,135,0.10)";

              const inner = (
                <>
                  <span className="text-[11px] font-medium leading-none mb-1 w-5 h-5 flex items-center justify-center rounded-full" style={{ color: textColor }}>
                    {cell.day}
                  </span>
                  {finished && (
                    <span className="text-[8px] leading-tight truncate w-full" style={{ color: "#C97B5A" }}>
                      {finished.title.slice(0, 10)}{finished.title.length > 10 ? "…" : ""}
                    </span>
                  )}
                  {isLogged && !finished && (
                    <span className="w-1 h-1 rounded-full absolute bottom-1.5 left-1/2 -translate-x-1/2" style={{ background: isStreak ? "#7B9E87" : "var(--fg-faint)" }} />
                  )}
                  {hasQuote && (
                    <span className="text-[8px] absolute top-1 right-1" style={{ color: "#D4A843" }}>✦</span>
                  )}
                </>
              );

              if (isFuture) {
                return (
                  <div key={i} className="aspect-square border-r border-b flex flex-col items-start justify-start p-1.5 relative" style={{ borderColor: "var(--border-light)", background: bg, opacity: 0.45, cursor: "default" }}>
                    {inner}
                  </div>
                );
              }

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className="aspect-square border-r border-b flex flex-col items-start justify-start p-1.5 transition-colors hover:bg-[rgba(45,27,46,0.06)] relative text-left"
                  style={{ borderColor: "var(--border-light)", background: bg }}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-column spread */}
        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            <p className="section-label mb-4">on the nightstand</p>
            {reading.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--fg-faint)" }}>
                nothing in progress —{" "}
                <Link href={`/${year}/books`} className="underline hover:opacity-70">start a book</Link>
              </p>
            ) : (
              <div className="space-y-3">
                {reading.map((b) => (
                  <Link key={b.id} href={`/book/${b.id}`} className="block group py-1">

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>{b.title}</p>
                      {b.author && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>{b.author}</p>}
                      {b.moodTags.length > 0 && <p className="text-[10px] mt-1" style={{ color: "var(--fg-faint)" }}>{b.moodTags.slice(0, 2).join(" · ")}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {finishedThisMonth.length > 0 && (
              <div className="mt-8">
                <p className="section-label mb-4">finished this month</p>
                <div className="space-y-3">
                  {finishedThisMonth.map((b) => (
                    <Link key={b.id} href={`/book/${b.id}`} className="block group py-1">
  
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--fg)" }}>{b.title}</p>
                        {b.author && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>{b.author}</p>}
                        {b.rating > 0 && <p className="text-[10px] mt-1" style={{ color: "#D4A843" }}>{"★".repeat(Math.round(b.rating))}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="section-label mb-4">saved quotes{quotesThisMonth.length > 0 ? ` · ${quotesThisMonth.length}` : ""}</p>
            {quotesThisMonth.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--fg-faint)" }}>
                no quotes saved this month —{" "}
                <Link href={`/${year}/quotes`} className="underline hover:opacity-70">view all</Link>
              </p>
            ) : (
              <div className="space-y-4">
                {quotesThisMonth.slice(0, 5).map((q) => (
                  <div key={q.id} className="pl-3" style={{ borderLeft: "2px solid var(--lavender)" }}>
                    <p className="font-[family-name:var(--font-playfair)] text-sm italic leading-relaxed" style={{ color: "var(--fg)" }}>"{q.text}"</p>
                    {(q.bookTitle || q.pageNumber) && (
                      <p className="text-[10px] mt-1.5" style={{ color: "var(--fg-faint)" }}>
                        {q.bookTitle && <span>{q.bookTitle}</span>}
                        {q.pageNumber && <span> · p. {q.pageNumber}</span>}
                      </p>
                    )}
                  </div>
                ))}
                {quotesThisMonth.length > 5 && (
                  <Link href={`/${year}/quotes`} className="back-link">{quotesThisMonth.length - 5} more →</Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-[24]"
          style={{ top: "3.5rem", background: "rgba(0,0,0,0.08)" }}
          onClick={() => setSelectedDate(null)}
        />
      )}

      {/* Daily Log Panel */}
      <div
        className="fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-full md:w-[380px] z-[25] border-l shadow-xl transition-transform duration-300"
        style={{
          borderColor: "var(--border-light)",
          transform: panelOpen ? "translateX(0)" : "translateX(100%)",
          background: "var(--bg-surface)",
        }}
      >
        {selectedDate && (
          <DayPanel
            key={selectedDate}
            date={selectedDate}
            todayStr={todayStr}
            log={panelLog}
            dayQuotes={panelQuotes}
            dayFinished={panelFinished}
            dayStarted={panelStarted}
            dayReading={panelReading}
            dayThoughts={panelThoughts}
            isLogged={panelIsLogged}
            onClose={() => setSelectedDate(null)}
            onToggled={handleToggled}
            onNoteSaved={handleNoteSaved}
            onQuoteAdded={handleQuoteAdded}
          />
        )}
      </div>
    </div>
  );
}
