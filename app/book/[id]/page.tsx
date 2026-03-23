"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { BookmarkButton } from "@/components/BookmarkButton";
import { StarDisplay } from "@/components/StarDisplay";
import type { BookEntry, BookRead, ReadingStatus, Thought } from "@/types";

const statuses: { value: ReadingStatus; label: string }[] = [
  { value: "reading", label: "reading" },
  { value: "finished", label: "finished" },
  { value: "did-not-finish", label: "did not finish" },
  { value: "want-to-read", label: "want to read" },
];

function StarRating({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const getRating = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = e.clientX - rect.left;
    const raw = (x / rect.width) * 5;
    return Math.max(0.25, Math.min(5, Math.round(raw * 4) / 4));
  };

  const display = hover ?? rating;

  return (
    <div
      ref={containerRef}
      className="cursor-pointer"
      onMouseMove={(e) => setHover(getRating(e))}
      onMouseLeave={() => setHover(null)}
      onClick={(e) => {
        const r = getRating(e);
        if (r !== null) onChange(rating === r ? 0 : r);
      }}
    >
      <StarDisplay rating={display} />
    </div>
  );
}

function formatReadRange(read: { dateStarted: string; dateFinished: string; dateShelved: string }) {
  const start = read.dateStarted ? new Date(read.dateStarted).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "?";
  const end = read.dateFinished
    ? new Date(read.dateFinished).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : read.dateShelved
    ? new Date(read.dateShelved).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  return end && end !== start ? `${start} – ${end}` : start;
}

function formatThoughtTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function GenreTags({ genres, onChange }: { genres: string[]; onChange: (g: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");

  const commit = () => {
    const val = input.trim();
    if (val && !genres.includes(val)) onChange([...genres, val]);
    setInput("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {genres.map((g) => (
        <button
          key={g}
          onClick={() => onChange(genres.filter((x) => x !== g))}
          className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          {g} ×
        </button>
      ))}
      {adding ? (
        <input
          autoFocus
          id="genre-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setInput(""); setAdding(false); }
          }}
          onBlur={commit}
          placeholder="genre..."
          className="text-xs px-2 py-0.5 rounded-full border border-stone-300 outline-none bg-transparent text-stone-600 placeholder:text-stone-300 w-20"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-2 py-0.5 rounded-full border border-dashed border-stone-200 text-stone-300 hover:text-stone-500 hover:border-stone-400 transition-colors"
        >
          + genre
        </button>
      )}
    </div>
  );
}

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<BookEntry | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [thoughtInput, setThoughtInput] = useState("");
  const [rereadLoading, setRereadLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Partial<BookEntry>>({});
  const feelingRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!feelingRef.current) return;
    feelingRef.current.style.height = "auto";
    feelingRef.current.style.height = feelingRef.current.scrollHeight + "px";
  });

  useEffect(() => {
    getEntry(id).then((found) => {
      if (!found) { router.replace("/"); return; }
      setEntry(found);
    });
  }, [id, router]);

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
      setEntry((prev) => {
        if (!prev) return prev;
        return { ...prev, ...patch, updatedAt: new Date().toISOString() };
      });
      save(patch);
    },
    [save]
  );

  const postThought = async () => {
    const text = thoughtInput.trim();
    if (!text || !entry) return;
    const thought: Thought = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    };
    setEntry((prev) =>
      prev ? { ...prev, thoughts: [...prev.thoughts, thought] } : prev
    );
    setThoughtInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    await addThought(entry.id, thought);
  };

  const handleDeleteThought = async (thoughtId: string) => {
    if (!entry) return;
    setEntry((prev) =>
      prev ? { ...prev, thoughts: prev.thoughts.filter((t) => t.id !== thoughtId) } : prev
    );
    await removeThought(thoughtId, entry.id);
  };

  const handleStatusChange = (status: ReadingStatus) => {
    const patch: Partial<BookEntry> = { status };
    if (status === "finished" && entry && !entry.dateFinished) {
      patch.dateFinished = new Date().toISOString().split("T")[0];
    }
    if (status === "did-not-finish" && entry && !entry.dateShelved) {
      patch.dateShelved = new Date().toISOString().split("T")[0];
    }
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

  if (!entry) return (
    <div className="page">
      <div className="max-w-3xl mx-auto px-6 py-10 animate-pulse">
        <div className="h-4 w-16 bg-stone-200 rounded mb-8" />
        <div className="h-7 w-2/3 bg-stone-200 rounded mb-3" />
        <div className="h-4 w-1/3 bg-stone-200 rounded mb-6" />
        <div className="flex gap-2 mb-6">
          {[1,2,3].map((i) => <div key={i} className="h-7 w-20 bg-stone-200 rounded-full" />)}
        </div>
        <div className="h-4 w-1/2 bg-stone-200 rounded mb-6" />
        <div className="h-16 w-full bg-stone-200 rounded" />
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-content-sm">

        {/* top bar */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/shelf" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
            ← shelf
          </Link>
          <div className="flex items-center gap-4">
            <BookmarkButton
              bookmarked={entry.bookmarked}
              onToggle={() => update({ bookmarked: !entry.bookmarked })}
            />
            <span className="text-xs text-stone-300">
              {saveState === "saving" ? "saving..." : saveState === "saved" ? "saved" : ""}
            </span>
          </div>
        </div>

        {/* title */}
        <input
          id="book-title"
          type="text"
          value={entry.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="book title"
          className="w-full text-2xl font-semibold text-stone-900 bg-transparent border-none outline-none placeholder:text-stone-300 mb-1 lowercase"
        />

        {/* author */}
        <input
          id="book-author"
          type="text"
          value={entry.author}
          onChange={(e) => update({ author: e.target.value })}
          placeholder="author"
          className="w-full text-sm text-stone-400 bg-transparent border-none outline-none placeholder:text-stone-300 mb-4 lowercase"
        />

        {/* genres */}
        <GenreTags
          genres={entry.genres}
          onChange={(genres) => update({ genres })}
        />

        {/* status pills */}
        <div className="flex gap-2 mb-6">
          {statuses.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleStatusChange(value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                entry.status === value
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-transparent text-stone-400 border-stone-200 hover:border-stone-400 hover:text-stone-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* metadata row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6">
          <div className="flex items-center gap-1.5 text-stone-400">
            <span className="text-xs">started</span>
            <input
              id="date-started"
              type="date"
              value={entry.dateStarted}
              onChange={(e) => update({ dateStarted: e.target.value })}
              className="text-stone-500 bg-transparent border-none outline-none text-xs"
            />
          </div>
          {(entry.status === "finished" || entry.dateFinished) && (
            <div className="flex items-center gap-1.5 text-stone-400">
              <span className="text-xs">finished</span>
              <input
                id="date-finished"
                type="date"
                value={entry.dateFinished}
                onChange={(e) => update({ dateFinished: e.target.value })}
                className="text-stone-500 bg-transparent border-none outline-none text-xs"
              />
            </div>
          )}
          {(entry.status === "did-not-finish" || entry.dateShelved) && (
            <div className="flex items-center gap-1.5 text-stone-400">
              <span className="text-xs">shelved</span>
              <input
                id="date-shelved"
                type="date"
                value={entry.dateShelved}
                onChange={(e) => update({ dateShelved: e.target.value })}
                className="text-stone-500 bg-transparent border-none outline-none text-xs"
              />
            </div>
          )}
          <StarRating rating={entry.rating} onChange={(r) => update({ rating: r })} />
        </div>

        {/* feeling */}
        {(entry.status === "finished" || entry.status === "did-not-finish") && (
          <textarea
            ref={feelingRef}
            value={entry.feeling}
            onChange={(e) => update({ feeling: e.target.value })}
            placeholder="how does it make you feel?"
            rows={1}
            className="w-full text-sm italic text-stone-500 bg-transparent border-none outline-none resize-none placeholder:text-stone-300 mb-6 leading-relaxed overflow-hidden"
          />
        )}

        {/* re-read button */}
        {(entry.status === "finished" || entry.status === "did-not-finish") && (
          <div className="mb-6">
            <button
              onClick={handleReread}
              disabled={rereadLoading}
              className="text-xs text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50"
            >
              {rereadLoading ? "starting..." : "↺ re-read"}
            </button>
          </div>
        )}

        {/* past reads */}
        {entry.reads.length > 0 && (
          <div className="mb-6">
            <p className="section-label mb-3">read history</p>
            <div className="space-y-3">
              {/* current read */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">{formatReadRange(entry)}</span>
                <span className="text-xs text-stone-300">·</span>
                <span className="text-xs text-stone-400 capitalize">{entry.status.replace(/-/g, " ")}</span>
                {entry.rating > 0 && <StarDisplay rating={entry.rating} size={11} />}
                <span className="text-xs text-amber-700">← current</span>
              </div>
              {/* archived past reads, most recent first */}
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
                    onClick={() => handleDeleteRead(read.id)}
                    className="text-xs text-stone-200 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <hr className="border-stone-200 mb-6" />

        {/* thoughts log */}
        <div className="space-y-4 mb-6">
          {entry.thoughts.length === 0 && (
            <p className="text-sm text-stone-300">no thoughts yet — add one below</p>
          )}
          {entry.thoughts.map((thought) => (
            <div key={thought.id} className="group">
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap normal-case">
                {thought.text}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-stone-300">
                  {formatThoughtTime(thought.createdAt)}
                </span>
                <button
                  onClick={() => handleDeleteThought(thought.id)}
                  className="text-xs text-stone-200 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                >
                  delete
                </button>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* thought input */}
        <textarea
          value={thoughtInput}
          onChange={(e) => setThoughtInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              postThought();
            }
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          placeholder="add a thought... (enter to post, shift+enter for newline)"
          rows={1}
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200 resize-none transition-shadow leading-relaxed"
        />

        {/* footer */}
        <div className="mt-16 pt-4 border-t border-stone-100 flex justify-between items-center">
          <p className="text-xs text-stone-300">
            updated{" "}
            {new Date(entry.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <button
            onClick={async () => {
              await deleteEntry(entry.id);
              router.back();
            }}
            className="btn-delete"
          >
            delete entry
          </button>
        </div>
      </div>
    </div>
  );
}
