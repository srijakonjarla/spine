"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getEntry,
  updateEntry,
  deleteEntry,
  addThought,
  removeThought,
  startNewRead,
  deleteBookRead,
} from "@/lib/db";
import { getQuotes, addQuote, deleteQuote } from "@/lib/quotes";
import { BookmarkButton } from "@/components/BookmarkButton";
import { StarDisplay } from "@/components/StarDisplay";
import { StarRating } from "@/components/StarRating";
import { MoodChip } from "@/components/MoodChip";
import { QuoteCard } from "@/components/QuoteCard";
import { StatCard } from "@/components/StatCard";
import { usePreviousRoute } from "@/components/NavigationProvider";
import type { BookEntry, ReadingStatus, Thought, Quote } from "@/types";
import { localDateStr, parseLocalDate, formatDate, formatShortDate, daysApart, formatReadRange } from "@/lib/dates";
import { type TabId } from "./constants";
import { MOOD_TAGS } from "@/lib/constants";
import { STATUSES } from "@/lib/statusMeta";
import { heroGradientIndex, avgPagesPerDay, timeOfDayEmoji } from "./utils";

// ─── Hero sub-components ──────────────────────────────────────────

function HeroGenreAdd({ genres, onAdd }: { genres: string[]; onAdd: (g: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");

  const commit = () => {
    const val = input.trim();
    if (val && !genres.includes(val)) onAdd([...genres, val]);
    setInput("");
    setAdding(false);
  };

  if (adding) {
    return (
      <input
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setInput(""); setAdding(false); }
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

// ─── Tab: Reflection ──────────────────────────────────────────────

function ReflectionTab({
  entry,
  quotes,
  onUpdate,
  onTabChange,
  onReread,
  rereadLoading,
}: {
  entry: BookEntry;
  quotes: Quote[];
  onUpdate: (patch: Partial<BookEntry>) => void;
  onTabChange: (tab: TabId) => void;
  onReread: () => void;
  rereadLoading: boolean;
}) {
  const feelingRef = useRef<HTMLTextAreaElement>(null);
  const pace = avgPagesPerDay(entry);

  useEffect(() => {
    if (!feelingRef.current) return;
    feelingRef.current.style.height = "auto";
    feelingRef.current.style.height = feelingRef.current.scrollHeight + "px";
  });

  const previewQuotes = quotes.slice(0, 2);

  const metaRows = [
    { key: "Pages",        val: entry.pageCount ? String(entry.pageCount) : "—" },
    ...(entry.releaseDate ? [{ key: "Published", val: new Date(entry.releaseDate).getFullYear() }] : []),
    ...(entry.genres.length ? [{ key: "Genre", val: entry.genres[0] }] : []),
    ...(entry.dateStarted  ? [{ key: "Started",  val: formatDate(entry.dateStarted) }] : []),
    ...(entry.dateFinished ? [{ key: "Finished", val: formatDate(entry.dateFinished) }] : []),
    ...(entry.dateStarted && (entry.dateFinished || entry.status === "reading")
      ? [{ key: "Days reading", val: daysApart(entry.dateStarted, entry.dateFinished || localDateStr()) + 1 }]
      : []),
    ...(pace !== null ? [{ key: "Avg pages/day", val: pace }] : []),
    ...(entry.rating > 0  ? [{ key: "Rating", val: null, isRating: true }] : []),
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
              {quotes.length > 2 ? `see all ${quotes.length} →` : "+ add quote →"}
            </button>
          </div>
          {previewQuotes.length > 0 ? (
            <div className="space-y-3">
              {previewQuotes.map((q) => (
                <QuoteCard key={q.id} text={q.text} pageNumber={q.pageNumber} />
              ))}
            </div>
          ) : (
            <p className="font-hand text-[13px] text-fg-faint">no quotes saved yet</p>
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
              <span className="text-ink-light font-medium font-sans">{row.key}</span>
              {row.isRating
                ? <StarDisplay rating={entry.rating} size={12} />
                : <span className="text-plum font-semibold font-sans">{row.val}</span>
              }
            </div>
          ))}
        </div>

        {/* Reading sessions count */}
        {entry.thoughts.length > 0 && (
          <div className="book-surface p-5 mb-3.5">
            <p className="font-sans text-[11px] font-bold tracking-[0.08em] uppercase text-ink-light mb-2.5">
              Reading sessions
            </p>
            <p className="font-serif text-[28px] font-bold text-plum">{entry.thoughts.length}</p>
            <p className="font-hand text-[12px] text-terra mt-0.5">logged entries ✦</p>
            <button
              onClick={() => onTabChange("timeline")}
              className="mt-3 text-[11px] text-sage font-semibold font-sans bg-[var(--bg-sage-18)] border-none rounded-full px-3 py-[5px] cursor-pointer"
            >
              view timeline →
            </button>
          </div>
        )}

        {/* Re-reads */}
        {entry.reads.length > 0 && (
          <div className="book-surface p-5">
            <p className="book-card-heading text-[14px]">Re-reads</p>
            <div className="flex flex-col gap-2.5">
              {[...entry.reads].reverse().map((read, i) => (
                <div key={read.id}>
                  <p className="font-sans text-[10px] font-bold tracking-[0.08em] uppercase text-ink-light mb-0.5">
                    Read {entry.reads.length - i}
                  </p>
                  <p className="font-hand text-[13px] text-terra">
                    {read.dateStarted
                      ? `${formatShortDate(read.dateStarted)}${read.dateFinished ? ` – ${formatShortDate(read.dateFinished)}` : ""}`
                      : read.dateFinished
                      ? formatShortDate(read.dateFinished)
                      : "—"}
                  </p>
                  {read.rating > 0 && <StarDisplay rating={read.rating} size={11} />}
                  {read.feeling && (
                    <p className="font-hand text-[12px] text-ink-light mt-0.5 leading-snug">
                      {read.feeling}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {(entry.status === "finished" || entry.status === "did-not-finish") && (
              <button
                onClick={onReread}
                disabled={rereadLoading}
                className="mt-3 text-xs text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50"
              >
                {rereadLoading ? "starting..." : "↺ start a re-read"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Quotes ──────────────────────────────────────────────────

function QuotesTab({ bookId }: { bookId: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [input, setInput] = useState("");
  const [page, setPage] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getQuotes(bookId).then(setQuotes).catch(console.error);
  }, [bookId]);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const q = await addQuote(text, bookId, page.trim());
      setQuotes((prev) => [q, ...prev]);
      setInput("");
      setPage("");
      setOpen(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="px-10 py-7 bg-cream">
      {/* Add quote toggle */}
      <div className="mb-5 flex justify-end">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`text-xs font-semibold font-sans rounded-full px-3.5 py-1.5 border-none cursor-pointer transition-colors ${
            open
              ? "text-ink-light bg-[var(--bg-plum-soft)]"
              : "text-terra bg-[var(--bg-terra-15)]"
          }`}
        >
          {open ? "cancel" : "+ add quote"}
        </button>
      </div>

      {open && (
        <div className="book-surface p-5 mb-6">
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="paste the quote..."
            rows={3}
            className="w-full bg-transparent border-none outline-none resize-none font-serif text-[15px] italic leading-[1.7] text-ink mb-3"
          />
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="p. 42 (optional)"
              className="focus:outline-none text-xs bg-transparent border-b border-[var(--border-light)] pb-0.5 text-ink-light font-sans w-[120px]"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim() || adding}
              className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
            >
              save quote
            </button>
          </div>
          <p className="hint-text">↵ to save · esc to cancel</p>
        </div>
      )}

      {quotes.length === 0 && !open && (
        <div className="text-center py-16">
          <p className="font-hand text-[18px] text-fg-faint">no quotes saved yet</p>
          <p className="text-[13px] text-fg-faint mt-1.5 font-sans">add your first underlined quote</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5">
        {quotes.map((q) => (
          <div key={q.id} className="book-surface px-6 py-5">
            <QuoteCard
              text={q.text}
              pageNumber={q.pageNumber}
              onDelete={() => {
                deleteQuote(q.id);
                setQuotes((prev) => prev.filter((x) => x.id !== q.id));
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Timeline ────────────────────────────────────────────────

function TimelineTab({
  entry,
  onUpdate,
}: {
  entry: BookEntry;
  onUpdate: (patch: Partial<BookEntry>) => void;
}) {
  const [thoughtInput, setThoughtInput] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sortedThoughts = useMemo(
    () => [...entry.thoughts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entry.thoughts]
  );

  const calendarDays = useMemo(() => {
    if (!entry.dateStarted) return [];
    const start = parseLocalDate(entry.dateStarted);
    const end = entry.dateFinished ? parseLocalDate(entry.dateFinished) : new Date();
    if (!start || !end) return [];
    const days: { date: Date; dateStr: string }[] = [];
    const d = new Date(start);
    while (d <= end && days.length < 60) {
      days.push({ date: new Date(d), dateStr: localDateStr(d) });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [entry.dateStarted, entry.dateFinished]);

  const thoughtsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of entry.thoughts) {
      const key = localDateStr(new Date(t.createdAt)); // createdAt is TIMESTAMPTZ — safe to parse
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [entry.thoughts]);

  const finishedDateStr = entry.dateFinished ?? null;

  const postThought = async () => {
    const text = thoughtInput.trim();
    if (!text || isPosting || !entry) return;
    setIsPosting(true);
    const thought: Thought = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
    onUpdate({ thoughts: [...entry.thoughts, thought] });
    setThoughtInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      await addThought(entry.id, thought);
    } finally {
      setIsPosting(false);
    }
  };

  const deleteT = async (thoughtId: string) => {
    onUpdate({ thoughts: entry.thoughts.filter((t) => t.id !== thoughtId) });
    await removeThought(thoughtId, entry.id);
  };

  const legendItems = [
    { bg: "var(--bg-plum-trace)", label: "no entry" },
    { bg: "var(--bg-sage-25)",    label: "logged" },
    { bg: "var(--terra)",         label: "finished" },
  ];

  return (
    <div
      className="grid bg-cream"
      style={{ gridTemplateColumns: "1fr 280px" }}
    >
      {/* Main column */}
      <div className="px-9 py-7 pb-10">
        {/* Calendar strip */}
        {calendarDays.length > 0 && (
          <div className="mb-7">
            <p className="font-hand text-[13px] text-ink-light mb-2.5">days you spent with this book</p>
            <div className="flex gap-[5px] flex-wrap">
              {calendarDays.map(({ date, dateStr }) => {
                const count = thoughtsByDay[dateStr] || 0;
                const isFinish = dateStr === finishedDateStr;
                let bg = "var(--bg-plum-trace)";
                if (isFinish) bg = "linear-gradient(135deg, var(--terra), rgba(201,123,90,0.7))";
                else if (count >= 3) bg = "var(--bg-sage-50)";
                else if (count >= 1) bg = "var(--bg-sage-25)";
                const color = isFinish ? "white" : count > 0 ? "var(--plum)" : "var(--ink-light)";
                return (
                  <div
                    key={dateStr}
                    title={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${count ? ` · ${count} note${count !== 1 ? "s" : ""}` : ""}`}
                    className="timeline-day"
                    style={{ background: bg, color }}
                  >
                    <span>{date.getDate()}</span>
                    {isFinish && <span className="text-[7px] text-white/85">✓</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2.5 flex-wrap">
              {legendItems.map(({ bg, label }) => (
                <span key={label} className="flex items-center gap-[5px] text-[10px] text-ink-light font-sans">
                  <span className="w-2.5 h-2.5 rounded-[2px] inline-block" style={{ background: bg }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="mb-6">
          {sortedThoughts.length === 0 ? (
            <p className="font-hand text-[16px] text-fg-faint">no reading notes yet — add one below</p>
          ) : (
            <div className="flex flex-col">
              {sortedThoughts.map((thought) => (
                <div key={thought.id} className="group thought-row">
                  <span className="font-hand text-[13px] text-terra w-[110px] shrink-0 pt-0.5">
                    {formatShortDate(thought.createdAt)} · {timeOfDayEmoji(thought.createdAt)}
                  </span>
                  <span className="font-hand text-[15px] text-ink leading-[1.55] flex-1">
                    {thought.text}
                  </span>
                  <button
                    onClick={() => deleteT(thought.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity btn-delete shrink-0"
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Add thought */}
        <textarea
          value={thoughtInput}
          onChange={(e) => setThoughtInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postThought(); }
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          placeholder="add a reading note... (enter to post, shift+enter for newline)"
          rows={2}
          className="timeline-thought-input"
        />
        <p className="hint-text mt-1.5">↵ to post · shift+↵ for newline</p>
      </div>

      {/* Sidebar */}
      <div className="px-[22px] py-[22px] bg-[var(--bg-plum-trace)] border-l border-[var(--border-light)]">
        <p className="section-label mb-3">Summary</p>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {[
            { val: entry.thoughts.length, lbl: "Entries" },
            { val: entry.pageCount ?? "—", lbl: "Pages" },
            ...(avgPagesPerDay(entry) !== null ? [{ val: avgPagesPerDay(entry)!, lbl: "Avg p/day" }] : []),
          ].map(({ val, lbl }) => (
            <StatCard key={lbl} label={lbl} value={val} />
          ))}
        </div>

        {entry.dateStarted && (
          <>
            <p className="section-label mb-2.5">Reading period</p>
            <div className="book-surface p-3 mb-5">
              <p className="font-hand text-[14px] text-plum">
                {formatShortDate(entry.dateStarted)}
                {(entry.dateFinished || entry.status === "reading") && (
                  <> → {entry.dateFinished ? formatShortDate(entry.dateFinished) : "now"}</>
                )}
              </p>
              <p className="text-[11px] text-ink-light font-sans mt-1">
                {daysApart(entry.dateStarted, entry.dateFinished || localDateStr()) + 1} days
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Details ─────────────────────────────────────────────────

function DetailsTab({
  entry,
  onUpdate,
  onDeleteRead,
  onDelete,
}: {
  entry: BookEntry;
  onUpdate: (patch: Partial<BookEntry>) => void;
  onDeleteRead: (id: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="px-10 py-7 pb-12 bg-cream">
      <div className="grid gap-7" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Left: edit fields */}
        <div className="book-surface p-7">
          <p className="book-card-heading text-[15px]">Edit details</p>

          <label className="detail-field-label">Title</label>
          <input
            type="text"
            value={entry.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="underline-input font-serif text-[15px] mb-4"
          />

          <label className="detail-field-label">Author</label>
          <input
            type="text"
            value={entry.author}
            onChange={(e) => onUpdate({ author: e.target.value })}
            className="underline-input text-[14px] mb-4"
          />

        </div>

        {/* Right: read history + delete */}
        <div>
          {entry.reads.length > 0 && (
            <div className="book-surface p-5 mb-3.5">
              <p className="book-card-heading text-[15px]">Read history</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">{formatReadRange(entry)}</span>
                  <span className="text-xs text-stone-300">·</span>
                  <span className="text-xs text-stone-400 capitalize">{entry.status.replace(/-/g, " ")}</span>
                  {entry.rating > 0 && <StarDisplay rating={entry.rating} size={11} />}
                  {entry.status === "reading" && <span className="text-xs text-amber-700">← current</span>}
                </div>
                {[...entry.reads].reverse().map((read) => (
                  <div key={read.id} className="group flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">{formatReadRange(read)}</span>
                        <span className="text-xs text-stone-300">·</span>
                        <span className="text-xs text-stone-400 capitalize">{read.status.replace(/-/g, " ")}</span>
                        {read.rating > 0 && <StarDisplay rating={read.rating} size={11} />}
                      </div>
                      {read.feeling && (
                        <p className="text-xs text-stone-400 italic mt-0.5">{read.feeling}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteRead(read.id)}
                      className="btn-delete opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="book-surface p-5">
            <p className="text-[11px] text-fg-faint font-sans mb-3">
              Updated {new Date(entry.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <button onClick={onDelete} className="btn-delete">
              delete entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Back link ────────────────────────────────────────────────────

function useBackLink() {
  const previous = usePreviousRoute();
  if (previous) return { label: previous.label, href: previous.pathname };
  return { label: "library", href: "/library" };
}

// ─── Main page ────────────────────────────────────────────────────

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const backLink = useBackLink();

  const [entry, setEntry] = useState<BookEntry | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("reflection");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [rereadLoading, setRereadLoading] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Partial<BookEntry>>({});

  useEffect(() => {
    getEntry(id).then((found) => {
      if (!found) { router.replace("/"); return; }
      setEntry(found);
    });
  }, [id, router]);

  useEffect(() => {
    getQuotes(id).then(setQuotes).catch(console.error);
  }, [id]);

  const save = useCallback(
    (patch: Partial<BookEntry>) => {
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = setTimeout(async () => {
        await updateEntry(id, pendingPatch.current);
        pendingPatch.current = {};
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      }, 600);
    },
    [id]
  );

  const update = useCallback(
    (patch: Partial<BookEntry>) => {
      setEntry((prev) => prev ? { ...prev, ...patch, updatedAt: new Date().toISOString() } : prev);
      save(patch);
    },
    [save]
  );

  const handleStatusChange = (status: ReadingStatus) => {
    const patch: Partial<BookEntry> = { status };
    if (status === "finished" && entry && !entry.dateFinished)
      patch.dateFinished = localDateStr();
    if (status === "did-not-finish" && entry && !entry.dateShelved)
      patch.dateShelved = localDateStr();
    update(patch);
  };

  const handleReread = async () => {
    if (!entry || rereadLoading) return;
    setRereadLoading(true);
    try {
      await startNewRead(entry);
      const refreshed = await getEntry(id);
      if (refreshed) setEntry(refreshed);
    } finally {
      setRereadLoading(false);
    }
  };

  const handleDeleteRead = async (readId: string) => {
    if (!entry) return;
    await deleteBookRead(readId);
    setEntry((prev) => prev ? { ...prev, reads: prev.reads.filter((r) => r.id !== readId) } : prev);
  };

  const handleDelete = async () => {
    if (!entry) return;
    await deleteEntry(entry.id);
    router.back();
  };

  if (!entry) return (
    <div className="page">
      <div className="max-w-3xl mx-auto px-6 py-10 animate-pulse">
        <div className="h-4 w-16 bg-stone-200 rounded mb-8" />
        <div className="h-7 w-2/3 bg-stone-200 rounded mb-3" />
        <div className="h-4 w-1/3 bg-stone-200 rounded mb-6" />
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-7 w-20 bg-stone-200 rounded-full" />)}
        </div>
        <div className="h-16 w-full bg-stone-200 rounded" />
      </div>
    </div>
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: "reflection", label: "Reflection" },
    { id: "timeline",   label: "Timeline" },
    { id: "quotes",     label: `Quotes${quotes.length ? ` · ${quotes.length}` : ""}` },
    { id: "details",    label: "Details" },
  ];

  const heroClass = `hero-gradient-${heroGradientIndex(entry.title)}`;

  // Active status pill color per value
  const statusActiveStyle = (value: ReadingStatus): React.CSSProperties | undefined => {
    if (entry.status !== value) return undefined;
    if (value === "finished")       return { background: "var(--terra)",              border: "1px solid var(--terra)",              color: "#fff" };
    if (value === "reading")        return { background: "var(--sage)",               border: "1px solid var(--sage)",               color: "#fff" };
    if (value === "did-not-finish") return { background: "rgba(255,255,255,0.18)",    border: "1px solid rgba(255,255,255,0.4)",     color: "#fff" };
    return                                 { background: "var(--lavender)",           border: "1px solid var(--lavender)",           color: "var(--plum)" };
  };

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      {/* ── Hero ── */}
      <div
        className={`${heroClass} relative overflow-hidden px-10 py-9 grid gap-8`}
        style={{ gridTemplateColumns: "180px 1fr" }}
      >
        {/* Decorative orb */}
        <div
          className="absolute -top-[60px] -right-[60px] w-[240px] h-[240px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(212,168,67,0.18), transparent 70%)" }}
        />

        {/* Back link */}
        <div className="absolute top-4 left-5 z-10">
          <Link href={backLink.href} className="text-xs text-white/55 no-underline font-sans">
            ← {backLink.label}
          </Link>
        </div>

        {/* Save state + bookmark */}
        <div className="absolute top-3.5 right-5 z-10 flex items-center gap-3">
          <span className="text-[11px] text-white/40 font-sans">
            {saveState === "saving" ? "saving..." : saveState === "saved" ? "saved ✓" : ""}
          </span>
          <BookmarkButton
            bookmarked={entry.bookmarked}
            onToggle={() => update({ bookmarked: !entry.bookmarked })}
          />
        </div>

        {/* Cover */}
        <div className="pt-6 relative z-[1]">
          {entry.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.coverUrl}
              alt={entry.title}
              className="w-[180px] rounded-lg block object-cover aspect-[2/3]"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
            />
          ) : (
            <div
              className="w-[180px] aspect-[2/3] rounded-lg bg-white/10 flex flex-col justify-end p-4"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
            >
              <p className="font-serif text-[15px] italic text-white/80 leading-[1.3] mb-1.5">{entry.title}</p>
              <p className="text-[10px] text-white/45 font-sans">{entry.author}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center relative z-[1] pt-6">
          <h1
            className="font-serif font-bold text-[var(--white)] leading-[1.05] mb-1 tracking-tight"
            style={{ fontSize: "clamp(26px, 3.5vw, 38px)" }}
          >
            {entry.title}
          </h1>
          <p className="font-serif text-[15px] italic text-white/55 mb-[18px]">
            by {entry.author}
          </p>

          {/* Editable card */}
          <div className="hero-overlay-card">
            {/* Status pills */}
            <div className="flex gap-1.5 flex-wrap mb-3.5">
              {STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
                  className="hero-status-pill"
                  style={statusActiveStyle(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Rating */}
            <div className="mb-3.5">
              <StarRating rating={entry.rating} onChange={(r) => update({ rating: r })} />
            </div>

            {/* Genre chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {entry.genres.map((g) => (
                <button
                  key={g}
                  onClick={() => update({ genres: entry.genres.filter((x) => x !== g) })}
                  className="hero-genre-chip"
                >
                  {g} ×
                </button>
              ))}
              <HeroGenreAdd genres={entry.genres} onAdd={(genres) => update({ genres })} />
            </div>

            {/* Dates */}
            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center gap-1.5">
                <span className="hero-date-label">started</span>
                <input
                  type="date"
                  value={entry.dateStarted}
                  onChange={(e) => update({ dateStarted: e.target.value })}
                  className="hero-date-input"
                />
              </div>
              {(entry.status === "finished" || entry.dateFinished) && (
                <div className="flex items-center gap-1.5">
                  <span className="hero-date-label">finished</span>
                  <input
                    type="date"
                    value={entry.dateFinished}
                    onChange={(e) => update({ dateFinished: e.target.value })}
                    className="hero-date-input"
                  />
                </div>
              )}
              {(entry.status === "did-not-finish" || entry.dateShelved) && (
                <div className="flex items-center gap-1.5">
                  <span className="hero-date-label">shelved</span>
                  <input
                    type="date"
                    value={entry.dateShelved}
                    onChange={(e) => update({ dateShelved: e.target.value })}
                    className="hero-date-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Page / quote counts */}
          <div className="flex gap-4 mt-3 items-center">
            {entry.pageCount && (
              <span className="text-[11px] text-white/40 font-sans">📖 {entry.pageCount} pages</span>
            )}
            {quotes.length > 0 && (
              <span className="text-[11px] text-white/40 font-sans">
                💬 {quotes.length} quote{quotes.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky tabs ── */}
      <div className="sticky top-0 z-20 bg-cream border-b border-[var(--border-light)] shadow-[0_2px_8px_var(--border-light)] flex gap-1 px-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "reflection" && (
        <ReflectionTab entry={entry} quotes={quotes} onUpdate={update} onTabChange={setActiveTab} onReread={handleReread} rereadLoading={rereadLoading} />
      )}
      {activeTab === "timeline" && <TimelineTab entry={entry} onUpdate={update} />}
      {activeTab === "quotes" && <QuotesTab bookId={entry.id} />}
      {activeTab === "details" && (
        <DetailsTab
          entry={entry}
          onUpdate={update}
          onDeleteRead={handleDeleteRead}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
