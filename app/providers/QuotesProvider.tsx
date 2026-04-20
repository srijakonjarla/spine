"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getQuotes } from "@/lib/quotes";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/lib/toast";
import type { Quote } from "@/types";

interface QuotesContextValue {
  quotes: Quote[];
  loading: boolean;
  refresh: () => void;
  addQuote: (q: Quote) => void;
  removeQuote: (id: string) => void;
}

const QuotesContext = createContext<QuotesContextValue | null>(null);

export function useQuotes(): QuotesContextValue {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error("useQuotes must be used within <QuotesProvider>");
  return ctx;
}

export function QuotesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (!user) {
      Promise.resolve().then(() => {
        setQuotes([]);
        setLoading(false);
      });
      return;
    }

    getQuotes()
      .then(setQuotes)
      .catch(() => toast("Failed to load quotes."))
      .finally(() => setLoading(false));
  }, [user]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    setLoading(true);
    getQuotes()
      .then(setQuotes)
      .catch(() => toast("Failed to load quotes."))
      .finally(() => setLoading(false));
  }, []);

  const addQuote = useCallback((q: Quote) => {
    setQuotes((prev) => [...prev, q]);
  }, []);

  const removeQuote = useCallback((id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const value = useMemo<QuotesContextValue>(
    () => ({ quotes, loading, refresh, addQuote, removeQuote }),
    [quotes, loading, refresh, addQuote, removeQuote],
  );

  return (
    <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>
  );
}
