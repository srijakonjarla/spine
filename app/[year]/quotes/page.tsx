"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getQuotes, deleteQuote } from "@/lib/quotes";
import type { Quote } from "@/types";

export default function QuoteCollectionPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuotes()
      .then(setQuotes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const handleDelete = async (id: string) => {
    await deleteQuote(id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/" className="back-link">← home</Link>
        </div>

        <div className="mb-10 pb-8 border-b border-stone-200">
          <p className="text-xs text-stone-300 mb-2 tracking-widest uppercase">reading journal · {year}</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold page-title tracking-tight">quote collection</h1>
          {!loading && (
            <p className="text-xs text-stone-400 mt-3">{quotes.length} saved</p>
          )}
        </div>

        {loading && (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-l-2 border-stone-200 pl-4">
                <div className="h-3 w-3/4 bg-stone-100 rounded mb-2" />
                <div className="h-3 w-1/2 bg-stone-100 rounded mb-3" />
                <div className="h-2 w-24 bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && quotes.length === 0 && (
          <p className="text-xs text-stone-400">
            no quotes saved yet — add them from any book page.
          </p>
        )}

        {!loading && quotes.length > 0 && (
          <div className="space-y-8">
            {quotes.map((quote) => (
              <div key={quote.id} className="group border-l-2 border-stone-200 pl-4 hover:border-stone-400 transition-colors">
                <p className="text-sm text-stone-700 italic leading-relaxed mb-2">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  {quote.bookTitle && (
                    <span>— {quote.bookTitle}</span>
                  )}
                  {quote.pageNumber && (
                    <span>· p. {quote.pageNumber}</span>
                  )}
                  <button
                    onClick={() => handleDelete(quote.id)}
                    className="ml-auto text-stone-200 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
