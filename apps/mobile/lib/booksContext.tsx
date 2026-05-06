import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BookEntry } from "@spine/shared";
import { useAuth } from "./auth";
import { getEntries } from "./library";

interface BooksContextValue {
  /** All books in the user's library (cached, shared across screens). */
  books: BookEntry[];
  loading: boolean;
  error: string | null;
  /** Force a refetch (e.g. after adding/deleting a book). */
  refresh: () => void;
  /** Optimistically update a book in the cache without refetching. */
  updateBook: (id: string, patch: Partial<BookEntry>) => void;
  /** Optimistically add a book to the cache. */
  addBook: (entry: BookEntry) => void;
  /** Optimistically remove a book from the cache. */
  removeBook: (id: string) => void;
}

const BooksContext = createContext<BooksContextValue | null>(null);

export function useBooks(): BooksContextValue {
  const ctx = useContext(BooksContext);
  if (!ctx) throw new Error("useBooks must be used inside BooksProvider");
  return ctx;
}

export function BooksProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return getEntries()
      .then((data) => setBooks(data))
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!session) {
      setBooks([]);
      setLoading(false);
      fetchedRef.current = false;
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void load();
  }, [session, load]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    void load().then(() => {
      fetchedRef.current = true;
    });
  }, [load]);

  const updateBook = useCallback((id: string, patch: Partial<BookEntry>) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const addBook = useCallback((entry: BookEntry) => {
    setBooks((prev) => [entry, ...prev]);
  }, []);

  const removeBook = useCallback((id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const value = useMemo<BooksContextValue>(
    () => ({
      books,
      loading,
      error,
      refresh,
      updateBook,
      addBook,
      removeBook,
    }),
    [books, loading, error, refresh, updateBook, addBook, removeBook],
  );

  return (
    <BooksContext.Provider value={value}>{children}</BooksContext.Provider>
  );
}
