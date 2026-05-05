"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  getEntry,
  updateEntry,
  deleteEntry,
  startNewRead,
  deleteBookRead,
  logHistoricalRead,
  updateBookRead,
} from "@/lib/db";
import { getQuotes } from "@/lib/quotes";
import { BookmarkButton } from "@/components/BookmarkButton";
import { BookDetailSkeleton } from "@/components/book/BookDetailSkeleton";
import { StarRating } from "@/components/StarRating";
import { usePreviousRoute } from "@/providers/NavigationProvider";
import type { BookEntry, ReadingStatus, Quote } from "@/types";
import { localDateStr } from "@/lib/dates";
import { toast } from "@/lib/toast";
import { STATUSES } from "@/lib/statusMeta";
import {
  ReflectionTab,
  TimelineTab,
  QuotesTab,
  DetailsTab,
} from "@/components/tabs";
import { TabId } from "@/lib/books";
import { BookContext } from "@/providers/BookContext";
import type { ReadPatch } from "@/providers/BookContext";

function addDays(date: string, n: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Deterministic 0-9 index derived from the book title, used to pick a hero gradient CSS class. */
function heroGradientIndex(title: string): number {
  let h = 0;
  const s = title || " ";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 10;
}

// ─── Hero sub-components ──────────────────────────────────────────

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
  const [selectedReadId, setSelectedReadId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [rereadLoading, setRereadLoading] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Partial<BookEntry>>({});

  useEffect(() => {
    getEntry(id).then((found) => {
      if (!found) {
        router.replace("/");
        return;
      }
      setEntry(found);
    });
  }, [id, router]);

  useEffect(() => {
    getQuotes(id)
      .then(setQuotes)
      .catch(() => toast("Failed to load data. Please refresh."));
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
    [id],
  );

  const update = useCallback(
    (patch: Partial<BookEntry>) => {
      setEntry((prev) =>
        prev
          ? { ...prev, ...patch, updatedAt: new Date().toISOString() }
          : prev,
      );
      save(patch);
    },
    [save],
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
    setEntry((prev) =>
      prev
        ? { ...prev, reads: prev.reads.filter((r) => r.id !== readId) }
        : prev,
    );
  };

  const handleUpdateRead = async (
    readId: string,
    patch: ReadPatch,
  ): Promise<void> => {
    if (!entry) return;
    await updateBookRead(entry.id, readId, patch);
    setEntry((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reads: prev.reads.map((read) =>
          read.id === readId
            ? { ...read, ...patch, updatedAt: new Date().toISOString() }
            : read,
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleLogRead = async (
    read: Omit<ReadPatch, "status">,
  ): Promise<void> => {
    if (!entry) return;
    const newRead = await logHistoricalRead(entry.id, {
      ...read,
      status: "finished",
    });
    setEntry((prev) =>
      prev ? { ...prev, reads: [...prev.reads, newRead] } : prev,
    );
  };

  const handleDelete = async () => {
    if (!entry) return;
    await deleteEntry(entry.id);
    router.back();
  };

  if (!entry) return <BookDetailSkeleton />;

  // The currently viewed read (null = current/user_books, else a historical book_read)
  const viewedRead = selectedReadId
    ? (entry.reads.find((r) => r.id === selectedReadId) ?? null)
    : null;

  // ── Build tab list (always 4) ─────────────────────────────────────
  const tabs: { id: TabId; label: string }[] = [
    { id: "reflection", label: "Reflection" },
    { id: "timeline", label: "Timeline" },
    {
      id: "quotes",
      label: `Quotes${quotes.length ? ` · ${quotes.length}` : ""}`,
    },
    { id: "details", label: "Details" },
  ];

  const heroClass = `hero-gradient-${heroGradientIndex(entry.title)}`;

  // Active status pill color per value
  const statusActiveStyle = (
    value: ReadingStatus,
  ): React.CSSProperties | undefined => {
    if (entry.status !== value) return undefined;
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
  };

  // ── Determine active tab content ──────────────────────────────────
  const renderTabContent = () => {
    if (activeTab === "timeline") return <TimelineTab />;
    if (activeTab === "quotes") return <QuotesTab />;
    if (activeTab === "details") return <DetailsTab />;
    return <ReflectionTab />;
  };

  return (
    <BookContext.Provider
      value={{
        entry,
        quotes,
        activeTab,
        setActiveTab,
        selectedReadId,
        setSelectedReadId,
        onUpdate: update,
        onDeleteRead: handleDeleteRead,
        onUpdateRead: handleUpdateRead,
        onLogRead: handleLogRead,
        onReread: handleReread,
        rereadLoading,
        onDelete: handleDelete,
      }}
    >
      <div
        className="page"
        style={{
          paddingBottom: 0,
        }}
      >
        {/* ── Hero ── */}
        <div
          className={`${heroClass} relative overflow-hidden px-5 py-7 sm:px-10 sm:py-9 grid gap-5 sm:gap-8 grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr] md:grid-cols-[180px_1fr]`}
        >
          {/* Decorative orb */}
          <div
            className="absolute -top-15 -right-15 w-60 h-60 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(212,168,67,0.18), transparent 70%)",
            }}
          />

          {/* Back link */}
          <div className="absolute top-4 left-5 z-10">
            <button
              onClick={() => router.back()}
              className="text-xs text-white/55 font-sans bg-transparent border-none cursor-pointer p-0"
            >
              ← {backLink.label}
            </button>
          </div>

          {/* Save state + bookmark */}
          <div className="absolute top-3.5 right-5 z-10 flex items-center gap-3">
            <span className="text-caption text-white/40 font-sans">
              {saveState === "saving"
                ? "saving..."
                : saveState === "saved"
                  ? "saved ✓"
                  : ""}
            </span>
            <button
              onClick={() => update({ upNext: !entry.upNext })}
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
              onToggle={() => update({ bookmarked: !entry.bookmarked })}
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
                <StarRating
                  rating={entry.rating}
                  onChange={(r) => update({ rating: r })}
                />
              </div>

              {/* Genre chips — catalog genres are read-only, user genres are removable */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {entry.genres.map((g) => {
                  const isUserGenre = entry.userGenres.includes(g);
                  return isUserGenre ? (
                    <button
                      key={g}
                      onClick={() =>
                        update({
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
                  genres={entry.genres}
                  onAdd={(g) =>
                    update({ userGenres: [...entry.userGenres, g] })
                  }
                />
              </div>

              {/* Dates — reflect the selected read when viewing a historical one */}
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/[0.08]">
                {viewedRead ? (
                  // Historical read: editable, saves via handleUpdateRead
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
                          handleUpdateRead(viewedRead.id, {
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
                          handleUpdateRead(viewedRead.id, {
                            ...viewedRead,
                            dateFinished: e.target.value,
                          })
                        }
                        className="hero-date-input"
                      />
                    </div>
                  </>
                ) : (
                  // Current read: fully editable
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
                        onChange={(e) =>
                          update({ dateStarted: e.target.value })
                        }
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
                            update({ dateFinished: e.target.value })
                          }
                          className="hero-date-input"
                        />
                      </div>
                    )}
                    {(entry.status === "did-not-finish" ||
                      entry.dateShelved) && (
                      <div className="flex items-center gap-1.5">
                        <span className="hero-date-label">shelved</span>
                        <input
                          id="book-current-date-shelved"
                          type="date"
                          value={entry.dateShelved}
                          min={entry.dateStarted || undefined}
                          max={localDateStr()}
                          onChange={(e) =>
                            update({ dateShelved: e.target.value })
                          }
                          className="hero-date-input"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Page / quote counts */}
            <div className="flex gap-4 mt-3 items-center flex-wrap">
              {(entry.pageCount ?? 0) > 0 && (
                <span className="text-caption text-white/40 font-sans">
                  📖 {entry.pageCount} pages
                </span>
              )}
              {quotes.length > 0 && (
                <span className="text-caption text-white/40 font-sans">
                  💬 {quotes.length} quote{quotes.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Read selector (shown when re-reads exist) ── */}
        {entry.reads.length > 0 && (
          <div className="bg-plum-trace border-b border-line px-4 sm:px-10 py-2.5 flex items-center gap-2 overflow-x-auto">
            <span className="text-detail text-fg-muted font-sans uppercase tracking-widest mr-1">
              Read
            </span>
            {[...entry.reads].map((read, i) => (
              <button
                key={read.id}
                onClick={() => setSelectedReadId(read.id)}
                className={`text-caption font-sans px-3 py-1 rounded-full border transition-colors ${
                  selectedReadId === read.id
                    ? "bg-plum border-plum text-white"
                    : "border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600"
                }`}
              >
                {i + 1}
                {(read.dateFinished || read.dateStarted) && (
                  <span className="ml-1 opacity-70">
                    ·{" "}
                    {new Date(
                      read.dateFinished || read.dateStarted,
                    ).getFullYear()}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setSelectedReadId(null)}
              className={`text-caption font-sans px-3 py-1 rounded-full border transition-colors ${
                selectedReadId === null
                  ? "bg-plum border-plum text-white"
                  : "border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600"
              }`}
            >
              Current
            </button>
            {/* Start a re-read — right-aligned */}
            <div className="ml-auto">
              <button
                onClick={handleReread}
                disabled={rereadLoading}
                className="text-caption font-sans text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50"
              >
                {rereadLoading ? "starting..." : "↺ start a re-read"}
              </button>
            </div>
          </div>
        )}

        {/* ── Sticky tabs ── */}
        <div className="sticky top-0 z-20 bg-cream border-b border-line shadow-[0_2px_8px_var(--border-light)] flex gap-1 px-4 sm:px-10 overflow-x-auto">
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
        {renderTabContent()}
      </div>
    </BookContext.Provider>
  );
}
