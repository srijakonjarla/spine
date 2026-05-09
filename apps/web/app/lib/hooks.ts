"use client";

import useSWR from "swr";
import { getEntries, getEntry } from "@/lib/db";
import { getQuotes } from "@/lib/quotes";
import type { BookEntry, Quote } from "@/types";

export function useEntry(id: string | undefined) {
  return useSWR<BookEntry | null>(id ? ["book", id] : null, async () =>
    id ? getEntry(id) : null,
  );
}

export function useEntriesByStatus(status: string | undefined) {
  return useSWR<BookEntry[]>(
    status ? ["books", "status", status] : null,
    async () => (status ? getEntries({ status }) : []),
  );
}

export function useBookQuotes(bookId: string | undefined) {
  return useSWR<Quote[]>(bookId ? ["quotes", bookId] : null, async () =>
    bookId ? getQuotes(bookId) : [],
  );
}
