"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { deleteQuote } from "@/lib/quotes";
import { useQuotes } from "@/providers/QuotesProvider";
import { QuoteCard } from "@/components/QuoteCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { YearQuotesSkeleton } from "@/components/skeletons/YearQuotesSkeleton";

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

        {loading && <YearQuotesSkeleton />}

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
