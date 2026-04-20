"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { deleteQuote } from "@/lib/quotes";
import { useQuotes } from "@/providers/QuotesProvider";
import { QuoteCard } from "@/components/QuoteCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function QuoteCollectionPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const { quotes, loading, removeQuote } = useQuotes();

  const handleDelete = async (id: string) => {
    removeQuote(id);
    await deleteQuote(id);
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/" className="back-link">
            ← home
          </Link>
        </div>

        <PageHeader
          title="quote collection"
          eyebrow={`reading journal · ${year}`}
          subtitle={!loading ? `${quotes.length} saved` : undefined}
        />

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
          <EmptyState message="no quotes saved yet — add them from any book page." />
        )}

        {!loading && quotes.length > 0 && (
          <div className="space-y-8">
            {quotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                text={quote.text}
                bookTitle={quote.bookTitle}
                pageNumber={quote.pageNumber}
                onDelete={() => handleDelete(quote.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
