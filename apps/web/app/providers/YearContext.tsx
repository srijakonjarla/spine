"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { getEntries } from "@/lib/db";
import { getGoals } from "@/lib/goals";
import { getLists } from "@/lib/lists";
import { useBooks } from "@/providers/BooksProvider";
import { useQuotes } from "@/providers/QuotesProvider";
import { useReadingLog } from "@/providers/ReadingLogProvider";
import { toast } from "@/lib/toast";
import type {
  BookEntry,
  BookList,
  ReadingLogEntry,
  ReadingGoal,
} from "@/types";

interface YearData {
  year: number;
  loading: boolean;
  /** All books in the user's library */
  allEntries: BookEntry[];
  /** Books associated with this year (via year filter) */
  yearEntries: BookEntry[];
  /** Books finished in this year — uses reads[] for accuracy */
  finishedBooks: BookEntry[];
  logEntries: ReadingLogEntry[];
  loggedDates: Set<string>;
  goals: ReadingGoal[];
  lists: BookList[];
  quoteCount: number;
  /** Setter for goals (for goal page mutations) */
  setGoals: React.Dispatch<React.SetStateAction<ReadingGoal[]>>;
  /** Setter for lists (for lists page mutations) */
  setLists: React.Dispatch<React.SetStateAction<BookList[]>>;
}

const YearContext = createContext<YearData | null>(null);

export function useYear(): YearData {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error("useYear must be used inside <YearProvider>");
  return ctx;
}

export function YearProvider({
  year,
  children,
}: {
  year: number;
  children: React.ReactNode;
}) {
  const { books: allEntries, loading: booksLoading } = useBooks();
  const { quotes: allQuotes, loading: quotesLoading } = useQuotes();
  const { logEntries, loggedDates, loading: logLoading } = useReadingLog();
  const [yearLoading, setYearLoading] = useState(true);
  const [yearEntries, setYearEntries] = useState<BookEntry[]>([]);
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [lists, setLists] = useState<BookList[]>([]);

  const quoteCount = useMemo(
    () => allQuotes.filter((q) => q.createdAt.startsWith(`${year}`)).length,
    [allQuotes, year],
  );

  // Fetch year-scoped data (not books, quotes, or log — those come from shared providers)
  useEffect(() => {
    Promise.all([getEntries({ year }), getGoals(year), getLists(year)])
      .then(([yearBks, gs, ls]) => {
        setYearEntries(yearBks);
        setGoals(gs);
        setLists(ls);
      })
      .catch(() => toast("Failed to load year data. Please refresh."))
      .finally(() => setYearLoading(false));
  }, [year]);

  const loading = booksLoading || quotesLoading || logLoading || yearLoading;

  // book_reads holds archived previous reads (a new row is only created when the
  // user starts another re-read). The current/active read lives in user_books
  // itself. We count both sources separately so all reads in the year are included.
  const finishedBooks = useMemo(() => {
    const result: BookEntry[] = [];
    for (const b of allEntries) {
      // Archived reads that finished this year (one entry per read)
      b.reads
        .filter((r) => r.dateFinished?.startsWith(`${year}`))
        .forEach((r) => result.push({ ...b, dateFinished: r.dateFinished }));

      // Current read (still in user_books) — finished this year
      if (b.status === "finished" && b.dateFinished?.startsWith(`${year}`)) {
        result.push(b);
      }
    }
    return result.sort((a, b) =>
      (a.dateFinished ?? "").localeCompare(b.dateFinished ?? ""),
    );
  }, [allEntries, year]);

  const value = useMemo<YearData>(
    () => ({
      year,
      loading,
      allEntries,
      yearEntries,
      finishedBooks,
      logEntries,
      loggedDates,
      goals,
      lists,
      quoteCount,
      setGoals,
      setLists,
    }),
    [
      year,
      loading,
      allEntries,
      yearEntries,
      finishedBooks,
      logEntries,
      loggedDates,
      goals,
      lists,
      quoteCount,
    ],
  );

  return <YearContext.Provider value={value}>{children}</YearContext.Provider>;
}
