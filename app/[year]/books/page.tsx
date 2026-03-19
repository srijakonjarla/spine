"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BookCard from "../../components/BookCard";
import { getEntries } from "../../lib/db";
import type { BookEntry } from "../../types";

function effectiveDate(e: BookEntry): string {
  if (e.status === "finished" && e.dateFinished) return e.dateFinished;
  if (e.status === "did-not-finish" && e.dateShelved) return e.dateShelved;
  return e.dateStarted || e.createdAt;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function sectionId(key: string) {
  return `month-${key}`;
}

export default function BooksPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const [entries, setEntries] = useState<BookEntry[]>([]);

  useEffect(() => {
    getEntries(year).then(setEntries).catch(console.error);
  }, [year]);

  const grouped = entries.reduce<Record<string, BookEntry[]>>((acc, e) => {
    const key = monthKey(effectiveDate(e));
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8 flex items-center gap-4">
          <Link href={`/${year}`} className="back-link">
            ← {year}
          </Link>
        </div>

        <h1 className="page-title mb-8">reading log · {year}</h1>

        {entries.length === 0 ? (
          <p className="text-xs text-stone-400">nothing logged yet.</p>
        ) : (
          <>
            {/* table of contents */}
            <div className="mb-10">
              <p className="section-label mb-3">contents</p>
              <div className="space-y-1">
                {months.map((key, i) => (
                  <a key={key} href={`#${sectionId(key)}`} className="flex items-baseline gap-1 group">
                    <span className="text-xs text-stone-300 w-5 shrink-0">{i + 1}.</span>
                    <span className="text-xs text-stone-500 group-hover:text-stone-800 transition-colors">
                      {monthLabel(key)}
                    </span>
                    <span className="flex-1 border-b border-dotted border-stone-200 mx-1 mb-0.5" />
                    <span className="text-xs text-stone-300">{grouped[key].length}</span>
                  </a>
                ))}
              </div>
            </div>

            <hr className="border-stone-200 mb-10" />

            {/* sections */}
            <div className="space-y-10">
              {months.map((key) => (
                <section key={key} id={sectionId(key)}>
                  <p className="section-label mb-3">
                    {monthLabel(key)}
                  </p>
                  <div className="space-y-0.5">
                    {grouped[key].map((e) => (
                      <BookCard key={e.id} entry={e} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
