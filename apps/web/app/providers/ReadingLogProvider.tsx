"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getReadingLog } from "@/lib/habits";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/lib/toast";
import type { ReadingLogEntry } from "@/types";

interface ReadingLogContextValue {
  /** Current year being tracked */
  year: number;
  logEntries: ReadingLogEntry[];
  loggedDates: Set<string>;
  loading: boolean;
  /** Refresh from server */
  refresh: () => void;
  /** Optimistically add a log entry */
  addEntry: (entry: ReadingLogEntry) => void;
  /** Optimistically remove a log entry by date */
  removeEntry: (date: string) => void;
  /** Optimistically update a log entry's note */
  updateNote: (date: string, note: string) => void;
}

const ReadingLogContext = createContext<ReadingLogContextValue | null>(null);

export function useReadingLog(): ReadingLogContextValue {
  const ctx = useContext(ReadingLogContext);
  if (!ctx)
    throw new Error("useReadingLog must be used within <ReadingLogProvider>");
  return ctx;
}

export function ReadingLogProvider({
  year,
  children,
}: {
  year: number;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => {
        setLogEntries([]);
        setLoading(false);
      });
      return;
    }

    getReadingLog(year)
      .then((entries) => setLogEntries(entries as ReadingLogEntry[]))
      .catch(() => toast("Failed to load reading log."))
      .finally(() => setLoading(false));
  }, [user, year]);

  const refresh = useCallback(() => {
    setLoading(true);
    getReadingLog(year)
      .then((entries) => setLogEntries(entries as ReadingLogEntry[]))
      .catch(() => toast("Failed to load reading log."))
      .finally(() => setLoading(false));
  }, [year]);

  const addEntry = useCallback((entry: ReadingLogEntry) => {
    setLogEntries((prev) =>
      prev.some((e) => e.logDate === entry.logDate) ? prev : [...prev, entry],
    );
  }, []);

  const removeEntry = useCallback((date: string) => {
    setLogEntries((prev) => prev.filter((e) => e.logDate !== date));
  }, []);

  const updateNote = useCallback((date: string, note: string) => {
    setLogEntries((prev) =>
      prev.map((e) => (e.logDate === date ? { ...e, note } : e)),
    );
  }, []);

  const loggedDates = useMemo(
    () => new Set(logEntries.map((e) => e.logDate)),
    [logEntries],
  );

  const value = useMemo<ReadingLogContextValue>(
    () => ({
      year,
      logEntries,
      loggedDates,
      loading,
      refresh,
      addEntry,
      removeEntry,
      updateNote,
    }),
    [
      year,
      logEntries,
      loggedDates,
      loading,
      refresh,
      addEntry,
      removeEntry,
      updateNote,
    ],
  );

  return (
    <ReadingLogContext.Provider value={value}>
      {children}
    </ReadingLogContext.Provider>
  );
}
