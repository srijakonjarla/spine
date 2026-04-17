"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getEntries, createEntry } from "@/lib/db";
import { type CatalogEntry, lookupBook } from "@/lib/catalog";
import { StarDisplay } from "@/components/StarDisplay";
import { BookCoverThumb } from "@/components/BookCover";
import { MoodChip, AllMoodsChip } from "@/components/MoodChip";
import type { BookEntry } from "@/types";
import { localDateStr, dateYear } from "@/lib/dates";
import ShelfDivider from "@/components/library/ShelfDivider";
import InlineAdd from "@/components/library/InlineAdd";

export default function LibraryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    getEntries()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allMoods = Array.from(
    new Set(entries.flatMap((e) => e.moodTags)),
  ).sort();
  const allGenres = Array.from(
    new Set(entries.flatMap((e) => e.genres)),
  ).sort();

  const matchesFilter = (e: BookEntry) => {
    const matchesSearch =
      !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase());
    const matchesMood = !activeMood || e.moodTags.includes(activeMood);
    const matchesGenre = !activeGenre || e.genres.includes(activeGenre);
    return matchesSearch && matchesMood && matchesGenre;
  };

  const currentlyReading = entries.filter(
    (e) => e.status === "reading" && matchesFilter(e),
  );
  const wantToRead = entries.filter(
    (e) => e.status === "want-to-read" && matchesFilter(e),
  );

  // Finished books grouped by year, descending
  const finishedFiltered = entries.filter(
    (e) => e.status === "finished" && matchesFilter(e),
  );
  const yearMap = new Map<number, BookEntry[]>();
  finishedFiltered.forEach((b) => {
    const y = b.dateFinished ? (dateYear(b.dateFinished) ?? 0) : 0;
    if (!yearMap.has(y)) yearMap.set(y, []);
    yearMap.get(y)!.push(b);
  });
  const yearGroups = Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, books]) => ({
      year,
      books: books.sort((a, b) =>
        (b.dateFinished ?? "").localeCompare(a.dateFinished ?? ""),
      ),
    }));

  const addBook = async (
    status: "reading" | "want-to-read",
    catalog?: CatalogEntry,
    raw?: string,
  ) => {
    const title = (catalog?.title ?? raw ?? "").trim();
    if (!title) return;
    const enriched = catalog ?? (await lookupBook(title));
    const now = new Date();
    const entry: BookEntry = {
      id: crypto.randomUUID(),
      catalogBookId: "",
      title: enriched?.title ?? title,
      author: enriched?.author ?? "",
      releaseDate: enriched?.releaseDate ?? "",
      genres: enriched?.genres ?? [],
      moodTags: [],
      bookshelves: [],
      status,
      dateStarted: status === "reading" ? localDateStr(now) : "",
      dateFinished: "",
      dateShelved: status === "want-to-read" ? localDateStr(now) : "",
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
    if (status === "reading") {
      router.push(`/book/${entry.id}`);
    } else {
      setEntries((prev) => [...prev, entry]);
    }
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/" className="back-link">
            ← home
          </Link>
        </div>

        <div className="flex items-baseline justify-between mb-6">
          <h1 className="page-title">library</h1>
          {!loading && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("grid")}
                className={`text-xs px-2 py-1 rounded transition-colors ${view === "grid" ? "bg-[var(--bg-hover)] text-[var(--fg)]" : "text-[var(--fg-faint)]"}`}
              >
                ▦
              </button>
              <button
                onClick={() => setView("list")}
                className={`text-xs px-2 py-1 rounded transition-colors ${view === "list" ? "bg-[var(--bg-hover)] text-[var(--fg)]" : "text-[var(--fg-faint)]"}`}
              >
                ☰
              </button>
              <span className="text-xs text-[var(--fg-faint)]">
                {entries.length} books
              </span>
            </div>
          )}
        </div>

        {/* Search + genre filter */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by title or author..."
            className="flex-1 underline-input"
          />
          {allGenres.length > 0 && (
            <select
              value={activeGenre ?? ""}
              onChange={(e) => setActiveGenre(e.target.value || null)}
              className="text-xs bg-transparent border-none outline-none cursor-pointer transition-colors text-[var(--fg-faint)] hover:text-[var(--fg-muted)]"
            >
              <option value="">all tags</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Mood filter chips */}
        {allMoods.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
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

        <div className="mb-8 pb-8 border-b border-[var(--border-light)]">
          {/* Currently reading */}
          {currentlyReading.length > 0 && (
            <div className="mb-6">
              <p className="section-label mb-3">currently reading</p>
              <div className="space-y-0.5">
                {currentlyReading.map((e) => (
                  <Link
                    key={e.id}
                    href={`/book/${e.id}`}
                    className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-[var(--bg-plum-trace)] transition-colors group"
                  >
                    <span className="text-xs shrink-0 text-terra">○</span>
                    <span className="text-sm flex-1 truncate text-[var(--fg)]">
                      {e.title}
                    </span>
                    {e.author && (
                      <span className="text-xs shrink-0 hidden sm:block text-[var(--fg-faint)]">
                        {e.author}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <InlineAdd
                placeholder="what are you reading?"
                onAdd={(c, r) => addBook("reading", c, r)}
                libraryEntries={entries}
              />
            </div>
          )}

          {currentlyReading.length === 0 && (
            <div className="mb-6">
              <p className="section-label mb-2">currently reading</p>
              <InlineAdd
                placeholder="what are you reading?"
                onAdd={(c, r) => addBook("reading", c, r)}
                libraryEntries={entries}
              />
            </div>
          )}

          {/* Want to read */}
          {wantToRead.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="section-label">want to read</p>
                <Link
                  href="/library/want-to-read"
                  className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors"
                >
                  all{" "}
                  {entries.filter((e) => e.status === "want-to-read").length} →
                </Link>
              </div>
              <div className="space-y-0.5">
                {wantToRead.slice(0, 8).map((e) => (
                  <Link
                    key={e.id}
                    href={`/book/${e.id}`}
                    className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-[var(--bg-plum-trace)] transition-colors group"
                  >
                    <span className="text-xs shrink-0 text-[var(--fg-faint)]">
                      ◌
                    </span>
                    <span className="text-sm flex-1 truncate text-[var(--fg)]">
                      {e.title}
                    </span>
                    {e.author && (
                      <span className="text-xs shrink-0 hidden sm:block text-[var(--fg-faint)]">
                        {e.author}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <InlineAdd
                placeholder="add to tbr..."
                onAdd={(c, r) => addBook("want-to-read", c, r)}
                libraryEntries={entries}
              />
            </div>
          )}

          {wantToRead.length === 0 && (
            <div>
              <p className="section-label mb-2">want to read</p>
              <InlineAdd
                placeholder="add to tbr..."
                onAdd={(c, r) => addBook("want-to-read", c, r)}
                libraryEntries={entries}
              />
            </div>
          )}
        </div>

        {/* Finished — grouped by year */}
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

        {!loading &&
          yearGroups.length === 0 &&
          !search &&
          !activeMood &&
          !activeGenre && (
            <p className="text-xs text-[var(--fg-faint)]">
              no finished books yet.
            </p>
          )}

        {!loading &&
          yearGroups.map(({ year, books }) => (
            <div key={year}>
              <ShelfDivider year={year} count={books.length} />

              {view === "grid" ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {books.map((e) => (
                    <Link key={e.id} href={`/book/${e.id}`} className="group">
                      <div className="relative mb-2 rounded-lg overflow-hidden group-hover:-translate-y-1 transition-transform h-[130px] shadow-sm">
                        <BookCoverThumb
                          coverUrl={e.coverUrl}
                          title={e.title}
                          author={e.author}
                          width="w-full"
                          height="h-full"
                        />
                        {/* Top-left: first mood tag */}
                        {e.moodTags[0] && (
                          <span className="absolute top-1.5 left-1.5 z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-white/90 text-[var(--fg)] leading-none">
                            {e.moodTags[0]}
                          </span>
                        )}
                        {/* Top-right: rating */}
                        {e.rating > 0 && (
                          <span className="absolute top-1.5 right-1.5 z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-black/40 text-gold leading-none tracking-tight">
                            {"★".repeat(Math.round(e.rating))}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium leading-tight truncate text-[var(--fg)]">
                        {e.title || "untitled"}
                      </p>
                      {e.author && (
                        <p className="text-[10px] mt-0.5 truncate text-[var(--fg-faint)]">
                          {e.author}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {books.map((e) => (
                    <Link
                      key={e.id}
                      href={`/book/${e.id}`}
                      className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-[var(--bg-plum-trace)] transition-colors group"
                    >
                      <BookCoverThumb
                        coverUrl={e.coverUrl}
                        title={e.title}
                        width="w-6"
                        height="h-9"
                      />
                      <span className="text-sm flex-1 truncate text-[var(--fg)]">
                        {e.title || "untitled"}
                      </span>
                      {e.author && (
                        <span className="text-xs shrink-0 hidden sm:block text-[var(--fg-faint)]">
                          {e.author}
                        </span>
                      )}
                      <span className="dot-leader hidden sm:block" />
                      {e.rating > 0 && (
                        <StarDisplay rating={e.rating} size={11} />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
