"use client";

import { createContext, useContext } from "react";
import type { BookEntry, Quote, ReadingStatus } from "@/types";
import type { TabId } from "@/lib/books";

export interface ReadPatch {
  status: ReadingStatus;
  dateStarted: string;
  dateFinished: string;
  rating: number;
  feeling: string;
}

export interface BookContextValue {
  entry: BookEntry;
  quotes: Quote[];
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  /** null = current (user_books) read; string = historical book_reads ID */
  selectedReadId: string | null;
  setSelectedReadId: (id: string | null) => void;
  onUpdate: (patch: Partial<BookEntry>) => void;
  onDeleteRead: (id: string) => void;
  onUpdateRead: (id: string, patch: ReadPatch) => Promise<void>;
  onLogRead: (read: Omit<ReadPatch, "status">) => Promise<void>;
  onReread: () => void;
  rereadLoading: boolean;
  onDelete: () => void;
}

export const BookContext = createContext<BookContextValue | null>(null);

export function useBook(): BookContextValue {
  const ctx = useContext(BookContext);
  if (!ctx)
    throw new Error("useBook must be used within a BookContext.Provider");
  return ctx;
}

/** Stable tab ID for the "current" read (user_books fields). */
export const CURRENT_READ_TAB = "read-current";
