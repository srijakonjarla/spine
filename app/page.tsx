"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getEntries, createEntry } from "./lib/db";
import { getLists } from "./lib/lists";
import { getReadingLog } from "./lib/habits";
import { searchCatalog, findOrCreateCatalogEntry, type CatalogEntry } from "./lib/catalog";
import { signOut, getDisplayName, hasImportedGoodreads } from "./lib/auth";
import { useAuth } from "./components/AuthProvider";
import { BookmarkSection } from "./components/BookmarkSection";
import type { BookEntry, BookList } from "./types";

const CURRENT_YEAR = new Date().getFullYear();

interface YearData {
  year: number;
  books: number;
  lists: BookList[];
  days: number;
  bookmarkedBooks: { id: string; title: string }[];
}

export default function Home() {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const [yearData, setYearData] = useState<YearData[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<{ id: string; title: string; author: string }[]>([]);
  const [goodreadsImported, setGoodreadsImported] = useState(true); // default true to avoid flash
  const [showArchive, setShowArchive] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const allBooks = await getEntries();

      setCurrentlyReading(allBooks.filter((b) => b.status === "reading").map((b) => ({ id: b.id, title: b.title, author: b.author })));

      const bookYear = (b: BookEntry) => {
        const d = (b.status === "finished" && b.dateFinished)
          ? b.dateFinished
          : (b.status === "did-not-finish" && b.dateShelved)
          ? b.dateShelved
          : b.dateStarted || b.createdAt;
        return new Date(d).getFullYear();
      };

      const yearSet = new Set<number>([CURRENT_YEAR]);
      allBooks.forEach((b) => yearSet.add(bookYear(b)));
      const years = Array.from(yearSet).sort((a, b) => b - a);

      const data = await Promise.all(
        years.map(async (year) => {
          const [lists, log] = await Promise.all([getLists(year), getReadingLog(year)]);
          const books = allBooks.filter((b) => bookYear(b) === year);
          return {
            year,
            books: books.length,
            lists,
            days: log.length,
            bookmarkedBooks: books.filter((b) => b.bookmarked).map((b) => ({ id: b.id, title: b.title })),
          };
        })
      );
      setYearData(data);
    }
    load().catch(console.error);
    hasImportedGoodreads().then(setGoodreadsImported);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setSuggestionIdx(-1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try { setSuggestions(await searchCatalog(value)); } catch { /* ignore */ }
    }, 250);
  }, []);

  const addBook = async (catalog?: CatalogEntry) => {
    const title = (catalog?.title ?? input).trim();
    if (!title || adding) return;
    setAdding(true);
    setSuggestions([]);
    const now = new Date();
    const entry: BookEntry = {
      id: crypto.randomUUID(),
      title,
      author: catalog?.author ?? "",
      status: "reading",
      dateStarted: now.toISOString().split("T")[0],
      dateFinished: "",
      dateShelved: "",
      rating: 0,
      feeling: "",
      thoughts: [],
      reads: [],
      bookmarked: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    try {
      const catalogEntry = catalog ?? await findOrCreateCatalogEntry(title, "");
      await createEntry(entry, catalogEntry.id);
      router.push(`/book/${entry.id}`);
    } catch (err) {
      console.error("addBook:", err);
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSuggestionIdx((i) => Math.max(i - 1, -1)); return; }
      if (e.key === "Escape") { setSuggestions([]); setSuggestionIdx(-1); return; }
    }
    if (e.key === "Enter") addBook(suggestionIdx >= 0 ? suggestions[suggestionIdx] : undefined);
  };

  return (
    <div className="page">
      <div className="page-content">

        {/* header */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">spine</h1>
            {user && <p className="text-xs text-stone-400 mt-0.5">welcome back, {getDisplayName(user)}</p>}
          </div>
          <button onClick={() => signOut()} className="text-xs text-stone-300 hover:text-stone-600 transition-colors mt-1">
            sign out
          </button>
        </div>

        {/* quick add */}
        <div className="mb-12 relative">
          <input
            ref={inputRef}
            id="quick-add"
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            placeholder="what are you reading?"
            disabled={adding}
            className="underline-input"
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden z-10">
              {suggestions.map((s, i) => (
                <button
                  key={s.id}
                  onMouseDown={() => addBook(s)}
                  className={`w-full text-left px-4 py-2.5 flex items-baseline gap-3 transition-colors ${i === suggestionIdx ? "bg-stone-50" : "hover:bg-stone-50"}`}
                >
                  <span className="text-sm text-stone-800 truncate">{s.title}</span>
                  {s.author && <span className="text-xs text-stone-400 shrink-0">{s.author}</span>}
                  {s.releaseDate && <span className="text-xs text-stone-300 shrink-0 ml-auto">{s.releaseDate}</span>}
                </button>
              ))}
            </div>
          )}
          {input.trim() && !adding && suggestions.length === 0 && <p className="hint-text">↵ to add</p>}
        </div>

        {/* currently reading */}
        {currentlyReading.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-3">currently reading</p>
            <div className="space-y-0.5">
              {currentlyReading.map((b) => (
                <Link key={b.id} href={`/book/${b.id}`} className="row-item group font-mono">
                  <span className="text-xs text-emerald-600">○</span>
                  <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">{b.title}</span>
                  {b.author && <span className="text-xs text-stone-400 shrink-0">{b.author}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* index */}
        <p className="section-label mb-6">index</p>

        <div className="space-y-10">
          {yearData.map(({ year, books, lists, days, bookmarkedBooks }, i) => {
            const isArchive = i > 0;
            if (isArchive && !showArchive) return null;
            return (
              <div key={year}>
                <div className="flex items-baseline gap-3 mb-2">
                  <Link href={`/${year}`} className={`font-semibold hover:opacity-60 transition-opacity ${year === CURRENT_YEAR ? "text-stone-900 text-base" : "text-stone-400 text-sm"}`}>
                    {year}
                  </Link>
                  {isArchive && <span className="text-xs text-stone-300">archive</span>}
                </div>

                <div className="space-y-0.5 ml-2">
                  <Link href={`/${year}/books`} className="row-item group">
                    <span className="text-xs text-stone-300">·</span>
                    <span className="text-sm text-stone-600 group-hover:text-stone-900 transition-colors">reading log</span>
                    <span className="dot-leader" />
                    <span className="text-xs text-stone-400">{books}</span>
                  </Link>

                  <Link href={`/${year}/lists`} className="row-item group">
                    <span className="text-xs text-stone-300">·</span>
                    <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">lists</span>
                    <span className="dot-leader" />
                    <span className="text-xs text-stone-400">{lists.length}</span>
                  </Link>

                  <Link href={`/${year}/habits`} className="row-item group">
                    <span className="text-xs text-stone-300">·</span>
                    <span className="text-sm text-stone-600 group-hover:text-stone-900 transition-colors">habit tracker</span>
                    <span className="dot-leader" />
                    <span className="text-xs text-stone-400">{days}d</span>
                  </Link>

                  <BookmarkSection books={bookmarkedBooks} lists={lists} year={year} />
                </div>
              </div>
            );
          })}
        </div>

        {yearData.length > 1 && (
          <button
            onClick={() => setShowArchive((v) => !v)}
            className="mt-6 text-xs text-stone-300 hover:text-stone-500 transition-colors"
          >
            {showArchive ? "↑ hide archive" : "↓ show archive"}
          </button>
        )}

        <div className="mt-12 pt-6 border-t border-stone-100 space-y-2">
          <div><Link href="/shelf" className="back-link">shelf →</Link></div>
          {!goodreadsImported && <div><Link href="/import" className="back-link">import from goodreads →</Link></div>}
        </div>

      </div>
    </div>
  );
}
