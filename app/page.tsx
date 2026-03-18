"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getEntries, createEntry } from "./lib/db";
import { getLists } from "./lib/lists";
import { getReadingLog } from "./lib/habits";
import { searchCatalog, findOrCreateCatalogEntry, type CatalogEntry } from "./lib/catalog";
import { signOut, getDisplayName } from "./lib/auth";
import { useAuth } from "./components/AuthProvider";
import type { BookEntry } from "./types";

const CURRENT_YEAR = new Date().getFullYear();

async function getYearSummary(year: number) {
  const [books, lists, log] = await Promise.all([
    getEntries(year),
    getLists(year),
    getReadingLog(year),
  ]);
  return { books, lists, log };
}

export default function Home() {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CatalogEntry | null>(null);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const [years, setYears] = useState<number[]>([]);
  const [summaries, setSummaries] = useState<
    Record<number, { books: number; lists: number; days: number }>
  >({});
  const router = useRouter();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // derive years from all books + lists
    async function load() {
      const [allBooks, currentLists, currentLog] = await Promise.all([
        getEntries(),
        getLists(CURRENT_YEAR),
        getReadingLog(CURRENT_YEAR),
      ]);

      const yearSet = new Set<number>([CURRENT_YEAR]);
      allBooks.forEach((b) => yearSet.add(new Date(b.createdAt).getFullYear()));
      const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
      setYears(sortedYears);

      // build summaries per year
      const booksByYear: Record<number, number> = {};
      allBooks.forEach((b) => {
        const y = new Date(b.createdAt).getFullYear();
        booksByYear[y] = (booksByYear[y] ?? 0) + 1;
      });

      const s: Record<number, { books: number; lists: number; days: number }> = {};
      s[CURRENT_YEAR] = {
        books: booksByYear[CURRENT_YEAR] ?? 0,
        lists: currentLists.length,
        days: currentLog.length,
      };

      // fetch other years in parallel
      const otherYears = sortedYears.filter((y) => y !== CURRENT_YEAR);
      await Promise.all(
        otherYears.map(async (y) => {
          const [lists, log] = await Promise.all([getLists(y), getReadingLog(y)]);
          s[y] = { books: booksByYear[y] ?? 0, lists: lists.length, days: log.length };
        })
      );
      setSummaries(s);
    }
    load().catch(console.error);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setSelectedSuggestion(null);
    setSuggestionIdx(-1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchCatalog(value);
        setSuggestions(results);
      } catch { /* ignore */ }
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
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIdx((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        setSuggestions([]);
        setSuggestionIdx(-1);
        return;
      }
    }
    if (e.key === "Enter") {
      const picked = suggestionIdx >= 0 ? suggestions[suggestionIdx] : null;
      addBook(picked ?? undefined);
    }
  };

  return (
    <div className="page">
      <div className="page-content">

        {/* header */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">spine</h1>
            {user && (
              <p className="text-xs text-stone-400 mt-0.5">
                welcome back, {getDisplayName(user)}
              </p>
            )}
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs text-stone-300 hover:text-stone-600 transition-colors mt-1"
          >
            sign out
          </button>
        </div>

        {/* quick add */}
        <div className="mb-12 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            placeholder="what are you reading?"
            disabled={adding}
            className="underline-input"
          />
          {/* typeahead suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden z-10">
              {suggestions.map((s, i) => (
                <button
                  key={s.id}
                  onMouseDown={() => addBook(s)}
                  className={`w-full text-left px-4 py-2.5 flex items-baseline gap-3 transition-colors ${
                    i === suggestionIdx ? "bg-stone-50" : "hover:bg-stone-50"
                  }`}
                >
                  <span className="text-sm text-stone-800 truncate">{s.title}</span>
                  {s.author && <span className="text-xs text-stone-400 shrink-0">{s.author}</span>}
                  {s.releaseDate && <span className="text-xs text-stone-300 shrink-0 ml-auto">{s.releaseDate}</span>}
                </button>
              ))}
            </div>
          )}
          {input.trim() && !adding && suggestions.length === 0 && (
            <p className="hint-text">↵ to add</p>
          )}
        </div>

        {/* import link */}
        <div className="mb-10">
          <Link href="/import" className="back-link">
            import from goodreads →
          </Link>
        </div>

        {/* index */}
        <div>
          <p className="section-label mb-4">
            index
          </p>
          <div className="space-y-6">
            {years.map((year) => {
              const s = summaries[year];
              return (
                <div key={year}>
                  <Link
                    href={`/${year}`}
                    className="group flex items-baseline gap-3 hover:opacity-70 transition-opacity"
                  >
                    <span className="text-sm font-semibold text-stone-800">{year}</span>
                    <span className="dot-leader" />
                    <span className="text-xs text-stone-400">→</span>
                  </Link>
                  {s && (
                    <div className="mt-1.5 ml-0 space-y-0.5">
                      <Link
                        href={`/${year}/books`}
                        className="flex items-baseline gap-2 group"
                      >
                        <span className="text-xs text-stone-300">·</span>
                        <span className="text-xs text-stone-500 group-hover:text-stone-800 transition-colors">
                          reading log
                        </span>
                        <span className="flex-1 border-b border-dotted border-stone-100 mb-0.5" />
                        <span className="text-xs text-stone-300">{s.books}</span>
                      </Link>
                      <Link
                        href={`/${year}/lists`}
                        className="flex items-baseline gap-2 group"
                      >
                        <span className="text-xs text-stone-300">·</span>
                        <span className="text-xs text-stone-500 group-hover:text-stone-800 transition-colors">
                          lists
                        </span>
                        <span className="flex-1 border-b border-dotted border-stone-100 mb-0.5" />
                        <span className="text-xs text-stone-300">{s.lists}</span>
                      </Link>
                      <Link
                        href={`/${year}/habits`}
                        className="flex items-baseline gap-2 group"
                      >
                        <span className="text-xs text-stone-300">·</span>
                        <span className="text-xs text-stone-500 group-hover:text-stone-800 transition-colors">
                          habit tracker
                        </span>
                        <span className="flex-1 border-b border-dotted border-stone-100 mb-0.5" />
                        <span className="text-xs text-stone-300">{s.days}d</span>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
