"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { getEntries, createEntry } from "@/lib/db";
import { type CatalogEntry, lookupBook } from "@/lib/catalog";
import { CatalogSearch } from "@/components/CatalogSearch";
import { STATUS_LABEL } from "@/lib/statusMeta";
import { StarDisplay } from "@/components/StarDisplay";
import type { BookEntry } from "@/types";
import { localDateStr } from "@/lib/dates";

const VALID_STATUSES = new Set(["reading", "finished", "want-to-read", "did-not-finish"]);

export default function StatusCatalogPage() {
  const { status } = useParams<{ status: string }>();
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");
  const [adding, setAdding] = useState(false);

  if (!VALID_STATUSES.has(status)) notFound();

  const addBook = async (catalog?: CatalogEntry) => {
    const title = (catalog?.title ?? addValue).trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const enriched = catalog ?? await lookupBook(title);
      const now = new Date();
      const today = localDateStr(now);
      const entry: BookEntry = {
        id: crypto.randomUUID(),
        title: enriched?.title ?? title,
        author: enriched?.author ?? "",
        genres: enriched?.genres ?? [],
        moodTags: [],
        status: status as BookEntry["status"],
        dateStarted: status === "reading" ? today : "",
        dateFinished: status === "finished" ? today : "",
        dateShelved: (status === "want-to-read" || status === "did-not-finish") ? today : "",
        rating: 0,
        feeling: "",
        thoughts: [],
        reads: [],
        bookmarked: false,
        coverUrl: enriched?.coverUrl ?? "",
        isbn: enriched?.isbn ?? "",
        pageCount: enriched?.pageCount ?? null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await createEntry(entry);
      setEntries((prev) => [entry, ...prev]);
      setAddValue("");
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    getEntries()
      .then((all) => setEntries(all.filter((e) => e.status === status)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  const allMoods = Array.from(new Set(entries.flatMap((e) => e.moodTags))).sort();

  const filtered = entries.filter((e) => {
    const matchSearch = !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase());
    const matchMood = !activeMood || e.moodTags.includes(activeMood);
    return matchSearch && matchMood;
  });

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/library" className="back-link">← library</Link>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <h1 className="page-title">{STATUS_LABEL[status]}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("grid")}
              className={`text-xs px-2 py-1 rounded transition-colors ${view === "grid" ? "bg-[var(--bg-hover)] text-[var(--fg)]" : "bg-transparent text-[var(--fg-faint)]"}`}
            >
              ▦
            </button>
            <button
              onClick={() => setView("list")}
              className={`text-xs px-2 py-1 rounded transition-colors ${view === "list" ? "bg-[var(--bg-hover)] text-[var(--fg)]" : "bg-transparent text-[var(--fg-faint)]"}`}
            >
              ☰
            </button>
          </div>
        </div>
        <p className="text-xs mb-8 text-[var(--fg-faint)]">{entries.length} books</p>

        {/* Add book */}
        <div className="mb-6">
          <CatalogSearch
            value={addValue}
            onChange={setAddValue}
            onSelect={(s) => addBook(s)}
            onSubmit={() => addBook()}
            placeholder={`add to ${STATUS_LABEL[status]?.toLowerCase() ?? status}...`}
            disabled={adding}
          />
          {addValue.trim() && !adding && (
            <p className="hint-text">↵ to add</p>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            id="status-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by title or author..."
            className="underline-input"
            disabled={loading}
          />
        </div>

        {/* Mood filter chips */}
        {allMoods.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveMood(null)}
              className={`text-xs px-3 py-1 rounded-full transition-colors border border-[var(--border-light)] ${!activeMood ? "bg-plum text-white" : "bg-[var(--bg-surface)] text-[var(--fg-muted)]"}`}
            >
              all
            </button>
            {allMoods.map((mood) => {
              const active = activeMood === mood;
              return (
                <button
                  key={mood}
                  onClick={() => setActiveMood(active ? null : mood)}
                  className={`mood-filter-chip mood-${mood.replace(/\s+/g, "-")}${active ? " active" : ""}`}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="rounded-lg mb-2 aspect-[2/3] bg-[var(--border)]" />
                <div className="h-2.5 rounded mb-1 w-4/5 bg-[var(--border)]" />
                <div className="h-2 rounded w-1/2 bg-[var(--border)]" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-xs text-[var(--fg-faint)]">no books found.</p>
        )}

        {!loading && filtered.length > 0 && view === "grid" && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((e) => (
              <Link key={e.id} href={`/book/${e.id}`} className="group relative">
                <div className="relative mb-2 rounded-lg overflow-hidden group-hover:opacity-85 transition-opacity h-[130px] bg-[var(--bg-hover)] border border-[var(--border-light)]">
                  {e.coverUrl ? (
                    <img src={e.coverUrl} alt={e.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between p-2.5">
                      {e.moodTags.length > 0 && (
                        <span className={`self-start text-[9px] px-1.5 py-0.5 rounded-full mood-grid-tag mood-${e.moodTags[0].replace(/\s+/g, "-")}`}>
                          {e.moodTags[0]}
                        </span>
                      )}
                      {e.rating > 0 && (
                        <span className="self-end text-[10px] text-gold">{"★".repeat(Math.round(e.rating))}</span>
                      )}
                    </div>
                  )}
                  {e.coverUrl && e.rating > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 text-[10px] text-gold drop-shadow">{"★".repeat(Math.round(e.rating))}</span>
                  )}
                </div>
                <p className="text-[11px] font-medium leading-tight truncate text-[var(--fg)]">{e.title || "untitled"}</p>
                {e.author && <p className="text-[10px] mt-0.5 truncate text-[var(--fg-faint)]">{e.author}</p>}
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && view === "list" && (
          <div className="space-y-0.5">
            {filtered.map((e) => (
              <Link key={e.id} href={`/book/${e.id}`} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--bg-plum-trace)] transition-colors group">
                <span className="text-sm truncate flex-1 text-[var(--fg)]">{e.title || "untitled"}</span>
                {e.author && <span className="text-xs shrink-0 hidden sm:block text-[var(--fg-faint)]">{e.author}</span>}
                <span className="dot-leader hidden sm:block" />
                {e.rating > 0 && <StarDisplay rating={e.rating} size={11} />}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
