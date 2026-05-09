"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getEntries } from "@/lib/db";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/lib/toast";
import type { BookEntry } from "@/types";

interface BooksContextValue {
  /** All books in the user's library (cached, shared across pages). */
  books: BookEntry[];
  loading: boolean;
  /** Force a refetch (e.g. after adding/deleting a book). */
  refresh: () => void;
  /**
   * Optimistically update a book in the cache without refetching.
   * Used after mutations so the UI updates instantly.
   */
  updateBook: (id: string, patch: Partial<BookEntry>) => void;
  /** Optimistically add a book to the cache. */
  addBook: (entry: BookEntry) => void;
  /** Optimistically remove a book from the cache. */
  removeBook: (id: string) => void;
}

const BooksContext = createContext<BooksContextValue | null>(null);

export function useBooks(): BooksContextValue {
  const ctx = useContext(BooksContext);
  if (!ctx) throw new Error("useBooks must be used within <BooksProvider>");
  return ctx;
}

export function BooksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => {
        setBooks([]);
        setLoading(false);
      });
      fetchedRef.current = false;
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Two-step load: shallow first (fast, ~600ms) so pages can render off
    // book metadata, then nested (thoughts + book_reads) hydrates in the
    // background so YearContext / month views get full read history.
    getEntries()
      .then((shallow) => {
        setBooks(shallow);
        setLoading(false);
        return getEntries({ include: "nested" }).then(setBooks);
      })
      .catch(() => toast("Failed to load books."))
      .finally(() => setLoading(false));
  }, [user]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    setLoading(true);
    getEntries()
      .then((shallow) => {
        setBooks(shallow);
        setLoading(false);
        return getEntries({ include: "nested" }).then(setBooks);
      })
      .catch(() => toast("Failed to load books."))
      .finally(() => setLoading(false));
  }, []);

  const updateBook = useCallback((id: string, patch: Partial<BookEntry>) => {
    startTransition(() => {
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      );
    });
  }, []);

  const addBook = useCallback((entry: BookEntry) => {
    startTransition(() => {
      setBooks((prev) => [entry, ...prev]);
    });
  }, []);

  const removeBook = useCallback((id: string) => {
    startTransition(() => {
      setBooks((prev) => prev.filter((b) => b.id !== id));
    });
  }, []);

  const value = useMemo<BooksContextValue>(
    () => ({ books, loading, refresh, updateBook, addBook, removeBook }),
    [books, loading, refresh, updateBook, addBook, removeBook],
  );

  return (
    <BooksContext.Provider value={value}>{children}</BooksContext.Provider>
  );
}
