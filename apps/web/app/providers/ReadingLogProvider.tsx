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
    setLogEntries((prev) => {
      const existing = prev.find((e) => e.logDate === entry.logDate);
      if (existing) {
        // Row exists (maybe note-only) — mark as logged
        return prev.map((e) =>
          e.logDate === entry.logDate ? { ...e, logged: true } : e,
        );
      }
      return [...prev, { ...entry, logged: true }];
    });
  }, []);

  const removeEntry = useCallback((date: string) => {
    setLogEntries((prev) =>
      prev.map((e) => (e.logDate === date ? { ...e, logged: false } : e)),
    );
  }, []);

  const updateNote = useCallback((date: string, note: string) => {
    setLogEntries((prev) => {
      const exists = prev.some((e) => e.logDate === date);
      if (exists) {
        return prev.map((e) => (e.logDate === date ? { ...e, note } : e));
      }
      return [...prev, { id: "", logDate: date, note, logged: false }];
    });
  }, []);

  const loggedDates = useMemo(
    () => new Set(logEntries.filter((e) => e.logged).map((e) => e.logDate)),
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
