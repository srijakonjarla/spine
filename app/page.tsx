"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getLists } from "@/lib/lists";
import { getReadingLog } from "@/lib/habits";
import { signOut, getDisplayName, hasImportedGoodreads } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import type { BookEntry, BookList } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();

interface JournalData {
  year: number;
  books: number;
  finished: number;
  lists: BookList[];
  days: number;
}

export default function Home() {
  const [journals, setJournals] = useState<JournalData[]>([]);
  const [goodreadsImported, setGoodreadsImported] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      const allBooks = await getEntries();

      const bookYear = (b: BookEntry) => {
        const d =
          b.status === "finished" && b.dateFinished
            ? b.dateFinished
            : b.status === "did-not-finish" && b.dateShelved
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
            finished: books.filter((b) => b.status === "finished").length,
            lists,
            days: log.length,
          };
        })
      );
      setJournals(data);
    }
    load().catch(console.error);
    hasImportedGoodreads().then(setGoodreadsImported);
  }, []);

  const currentJournal = journals.find((j) => j.year === CURRENT_YEAR);
  const archivedJournals = journals.filter((j) => j.year !== CURRENT_YEAR);

  return (
    <div className="page">
      <div className="page-content">

        {/* header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">spine</h1>
            {user && (
              <p className="text-xs text-stone-400 mt-0.5">
                {getDisplayName(user)}&apos;s reading journals
              </p>
            )}
          </div>
          <button onClick={() => signOut()} className="lg:hidden text-xs text-stone-300 hover:text-stone-600 transition-colors mt-1">
            sign out
          </button>
        </div>

        {/* current journal */}
        {currentJournal && (
          <div className="mb-10">
            <p className="section-label mb-4">this year</p>
            <Link href={`/${currentJournal.year}`} className="block group">
              <div className="border border-stone-200 rounded-lg px-5 py-4 hover:border-stone-400 transition-colors bg-white">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-base font-semibold text-stone-900">{currentJournal.year}</span>
                  <span className="text-xs text-stone-300">active</span>
                </div>
                <div className="flex gap-5 text-xs text-stone-400">
                  <span>{currentJournal.books} tracked</span>
                  <span>{currentJournal.finished} finished</span>
                  <span>{currentJournal.days} days read</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* archived journals */}
        {archivedJournals.length > 0 && (
          <div>
            <p className="section-label mb-4">archive</p>
            <div className="space-y-2">
              {archivedJournals.map((j) => (
                <Link key={j.year} href={`/${j.year}`} className="block group">
                  <div className="flex items-baseline gap-4 py-2.5 px-3 -mx-3 rounded hover:bg-stone-100/60 transition-colors">
                    <span className="text-sm font-semibold text-stone-500 group-hover:text-stone-800 transition-colors w-12 shrink-0">
                      {j.year}
                    </span>
                    <span className="dot-leader" />
                    <div className="flex gap-4 text-xs text-stone-300 shrink-0">
                      <span>{j.books} books</span>
                      <span>{j.days}d</span>
                    </div>
                    <span className="text-xs text-stone-300 group-hover:text-stone-500 transition-colors">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-stone-100 space-y-2">
          <div><Link href="/shelf" className="back-link">shelf →</Link></div>
          {!goodreadsImported && <div><Link href="/import" className="back-link">import from goodreads →</Link></div>}
        </div>

      </div>
    </div>
  );
}
