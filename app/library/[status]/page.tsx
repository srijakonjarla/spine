"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { getEntries, createEntry } from "@/lib/db";
import { type CatalogEntry, lookupBook } from "@/lib/catalog";
import { toast } from "@/lib/toast";
import { CatalogSearch } from "@/components/CatalogSearch";
import { STATUS_LABEL } from "@/lib/statusMeta";
import { StarDisplay } from "@/components/StarDisplay";
import { BookCoverThumb } from "@/components/BookCover";
import { MoodChip, AllMoodsChip } from "@/components/MoodChip";
import { EmptyState } from "@/components/EmptyState";
import type { BookEntry } from "@/types";
import { localDateStr } from "@/lib/dates";

const VALID_STATUSES = new Set([
  "reading",
  "finished",
  "want-to-read",
  "did-not-finish",
]);

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
      const enriched = catalog ?? (await lookupBook(title));
      const now = new Date();
      const today = localDateStr(now);
      const entry: BookEntry = {
        id: crypto.randomUUID(),
        catalogBookId: "",
        title: enriched?.title ?? title,
        author: enriched?.author ?? "",
        releaseDate: enriched?.releaseDate ?? "",
        genres: enriched?.genres ?? [],
        userGenres: [],
        moodTags: [],
        bookshelves: [],
        upNext: false,
        status: status as BookEntry["status"],
        dateStarted: status === "reading" ? today : "",
        dateFinished: status === "finished" ? today : "",
        dateShelved:
          status === "want-to-read" || status === "did-not-finish" ? today : "",
        rating: 0,
        feeling: "",
        thoughts: [],
        reads: [],
        bookmarked: false,
        publisher: enriched?.publisher ?? "",
        diversityTags: enriched?.diversityTags ?? [],
        userDiversityTags: [],
        format: "",
        audioDurationMinutes: enriched?.audioDurationMinutes ?? null,
        coverUrl: enriched?.coverUrl ?? "",
        isbn: enriched?.isbn ?? "",
        pageCount: enriched?.pageCount ?? null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await createEntry(entry);
      setEntries((prev) => [entry, ...prev]);
      setAddValue("");
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    getEntries({ status })
      .then((all) => setEntries(all.filter((e) => e.status === status)))
      .catch(() => toast("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, [status]);

  const allMoods = Array.from(
    new Set(entries.flatMap((e) => e.moodTags)),
  ).sort();

  const upNext = entries.filter((e) => e.upNext);

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase());
    const matchMood = !activeMood || e.moodTags.includes(activeMood);
    return matchSearch && matchMood;
  });

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/library" className="back-link">
            ← library
          </Link>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <h1 className="page-title">{STATUS_LABEL[status]}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("grid")}
              className={`text-xs px-2 py-1 rounded transition-colors ${view === "grid" ? "bg-hover text-fg" : "bg-transparent text-fg-faint"}`}
            >
              ▦
            </button>
            <button
              onClick={() => setView("list")}
              className={`text-xs px-2 py-1 rounded transition-colors ${view === "list" ? "bg-hover text-fg" : "bg-transparent text-fg-faint"}`}
            >
              ☰
            </button>
          </div>
        </div>
        <p className="text-xs mb-8 text-fg-faint">{entries.length} books</p>

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
          {addValue.trim() && !adding && <p className="hint-text">↵ to add</p>}
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
            <AllMoodsChip
              active={!activeMood}
              onClick={() => setActiveMood(null)}
            />
            {allMoods.map((mood) => (
              <MoodChip
                key={mood}
                mood={mood}
                active={activeMood === mood}
                onClick={() => setActiveMood(activeMood === mood ? null : mood)}
              />
            ))}
          </div>
        )}

        {/* Up next pinned section */}
        {!loading && upNext.length > 0 && (
          <div className="mb-8 pb-8 border-b border-line">
            <p className="section-label mb-3">up next</p>
            <div className="space-y-0.5">
              {upNext.map((e) => (
                <Link
                  key={e.id}
                  href={`/book/${e.id}`}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-plum-trace transition-colors group"
                >
                  <BookCoverThumb
                    coverUrl={e.coverUrl}
                    title={e.title}
                    author={e.author}
                    width="w-6"
                    height="h-9"
                  />
                  <span className="text-sm truncate flex-1 text-fg">
                    {e.title}
                  </span>
                  {e.author && (
                    <span className="text-xs shrink-0 hidden sm:block text-fg-faint">
                      {e.author}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="rounded-lg mb-2 aspect-[2/3] bg-edge" />
                <div className="h-2.5 rounded mb-1 w-4/5 bg-edge" />
                <div className="h-2 rounded w-1/2 bg-edge" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState message="no books found." />
        )}

        {!loading && filtered.length > 0 && view === "grid" && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((e) => (
              <Link
                key={e.id}
                href={`/book/${e.id}`}
                className="group relative"
              >
                <div className="relative mb-2 rounded-lg overflow-hidden group-hover:opacity-85 transition-opacity h-32.5">
                  <BookCoverThumb
                    coverUrl={e.coverUrl}
                    title={e.title}
                    author={e.author}
                    width="w-full"
                    height="h-full"
                  />
                  {e.rating > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 text-detail text-gold drop-shadow">
                      {"★".repeat(Math.round(e.rating))}
                    </span>
                  )}
                </div>
                <p className="text-caption font-medium leading-tight truncate text-fg">
                  {e.title || "untitled"}
                </p>
                {e.author && (
                  <p className="text-detail mt-0.5 truncate text-fg-faint">
                    {e.author}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && view === "list" && (
          <div className="space-y-0.5">
            {filtered.map((e) => (
              <Link
                key={e.id}
                href={`/book/${e.id}`}
                className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-plum-trace transition-colors group"
              >
                <span className="text-sm truncate flex-1 text-fg">
                  {e.title || "untitled"}
                </span>
                {e.author && (
                  <span className="text-xs shrink-0 hidden sm:block text-fg-faint">
                    {e.author}
                  </span>
                )}
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
