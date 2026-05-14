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
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/lib/toast";

export interface ListBookmark {
  id: string;
  title: string;
  year: number;
}

interface ListBookmarksContextValue {
  bookmarks: ListBookmark[];
  /**
   * Optimistically add, update, or remove a list bookmark in the cache.
   * Persisting the change to the server is the caller's responsibility.
   */
  setBookmarked: (list: ListBookmark, bookmarked: boolean) => void;
}

const ListBookmarksContext = createContext<ListBookmarksContextValue | null>(
  null,
);

export function useListBookmarks(): ListBookmarksContextValue {
  const ctx = useContext(ListBookmarksContext);
  if (!ctx)
    throw new Error(
      "useListBookmarks must be used within <ListBookmarksProvider>",
    );
  return ctx;
}

const MAX_BOOKMARKS = 8;

export function ListBookmarksProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<ListBookmark[]>([]);
  const fetchedRef = useRef(false);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setBookmarks([]);
      fetchedRef.current = false;
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    apiFetch("/api/nav")
      .then((res) => res.json())
      .then(
        (data: {
          bookmarks: { id: string; title: string; href: string }[];
        }) => {
          const lists: ListBookmark[] = [];
          for (const b of data.bookmarks ?? []) {
            const m = b.href.match(/^\/(\d+)\/lists\/(.+)$/);
            if (!m) continue;
            lists.push({ id: b.id, title: b.title, year: Number(m[1]) });
          }
          setBookmarks(lists);
        },
      )
      .catch(() => toast("Failed to load bookmarks."));
  }, [userId]);

  const setBookmarked = useCallback(
    (list: ListBookmark, bookmarked: boolean) => {
      startTransition(() => {
        setBookmarks((prev) => {
          if (!bookmarked) return prev.filter((b) => b.id !== list.id);
          const existing = prev.find((b) => b.id === list.id);
          if (existing) {
            return prev.map((b) => (b.id === list.id ? { ...b, ...list } : b));
          }
          return [list, ...prev].slice(0, MAX_BOOKMARKS);
        });
      });
    },
    [],
  );

  const value = useMemo<ListBookmarksContextValue>(
    () => ({ bookmarks, setBookmarked }),
    [bookmarks, setBookmarked],
  );

  return (
    <ListBookmarksContext.Provider value={value}>
      {children}
    </ListBookmarksContext.Provider>
  );
}
