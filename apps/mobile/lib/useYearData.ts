import { useCallback, useEffect, useMemo, useState } from "react";
import {
  finishedInYear,
  type BookEntry,
  type BookList,
  type Quote,
  type ReadingGoal,
  type ReadingLogEntry,
} from "@spine/shared";
import { useAuth } from "./auth";
import { useBooks } from "./booksContext";
import { loadGoalsForYear } from "./goals";
import { getReadingLog } from "./habits";
import { getQuotes } from "./library";
import { getLists } from "./lists";

export interface YearData {
  loading: boolean;
  error: string | null;
  allEntries: BookEntry[];
  /** One entry per read finished in the year (re-reads count separately). */
  finishedBooks: BookEntry[];
  logEntries: ReadingLogEntry[];
  loggedDates: Set<string>;
  goals: ReadingGoal[];
  lists: BookList[];
  /** Quotes saved during the year. */
  quotes: Quote[];
  refresh: () => void;
}

/**
 * Mobile counterpart of web's YearProvider: books come from the shared
 * BooksProvider cache, everything year-scoped is fetched per year.
 */
export function useYearData(year: number): YearData {
  const { session } = useAuth();
  const { books, loading: booksLoading } = useBooks();
  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [lists, setLists] = useState<BookList[]>([]);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [yearLoading, setYearLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!session) {
      setYearLoading(false);
      return;
    }
    let cancelled = false;
    setYearLoading(true);
    setError(null);
    Promise.all([
      getReadingLog(year),
      loadGoalsForYear(year),
      getLists(year),
      getQuotes(),
    ])
      .then(([log, gs, ls, qs]) => {
        if (cancelled) return;
        setLogEntries(log);
        setGoals(gs);
        setLists(ls);
        setAllQuotes(qs);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "load failed");
      })
      .finally(() => {
        if (!cancelled) setYearLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, year, nonce]);

  const finishedBooks = useMemo(
    () => finishedInYear(books, year),
    [books, year],
  );
  const loggedDates = useMemo(
    () => new Set(logEntries.filter((e) => e.logged).map((e) => e.logDate)),
    [logEntries],
  );
  const quotes = useMemo(
    () => allQuotes.filter((q) => q.createdAt.startsWith(`${year}`)),
    [allQuotes, year],
  );
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return {
    loading: booksLoading || yearLoading,
    error,
    allEntries: books,
    finishedBooks,
    logEntries,
    loggedDates,
    goals,
    lists,
    quotes,
    refresh,
  };
}
