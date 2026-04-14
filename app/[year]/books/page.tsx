"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BookCard from "@/components/BookCard";
import { CatalogSearch } from "@/components/CatalogSearch";
import { getEntries, createEntry } from "@/lib/db";
import { type CatalogEntry, lookupBook } from "@/lib/catalog";
import type { BookEntry } from "@/types";
import { localDateStr } from "@/lib/dates";

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
  });
}

function sectionId(key: string) {
  return `month-${key}`;
}

export default function BooksPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const router = useRouter();
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [activeBooks, setActiveBooks] = useState<BookEntry[]>([]);
  const [addValue, setAddValue] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([
      getEntries({ year }),
      getEntries(), // unfiltered — to catch currently-reading books started in prior years
    ]).then(([yearEntries, allEntries]) => {
      setEntries(yearEntries);
      setActiveBooks(allEntries.filter((e) => e.status === "reading"));
    }).catch(console.error);
  }, [year]);

  const addBook = async (catalog?: CatalogEntry) => {
    const title = (catalog?.title ?? addValue).trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      // If user typed without selecting a suggestion, look up Google Books
      const enriched = catalog ?? await lookupBook(title);
      const now = new Date();
      const entry: BookEntry = {
        id: crypto.randomUUID(),
        title: enriched?.title ?? title,
        author: enriched?.author ?? "",
        genres: enriched?.genres ?? [],
        moodTags: [],
        status: "reading",
        dateStarted: localDateStr(now),
        dateFinished: "",
        dateShelved: "",
        rating: 0,
        feeling: "",
        thoughts: [],
        reads: [],
        bookmarked: false,
        coverUrl: enriched?.coverUrl ?? "",
        isbn: enriched?.isbn ?? "",
        pageCount: enriched?.pageCount ?? null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await createEntry(entry);
      router.push(`/book/${entry.id}`);
    } catch (err) {
      console.error(err);
      setAdding(false);
    }
  };

  const loggable = entries.filter((e) => e.status !== "want-to-read");

  const grouped = loggable.reduce<Record<string, BookEntry[]>>((acc, e) => {
    const key = monthKey(effectiveDate(e));
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/" className="back-link">← home</Link>
        </div>

        <div className="mb-10 pb-8 border-b border-stone-200">
          <p className="text-xs text-stone-300 mb-2 tracking-widest uppercase">reading journal · {year}</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[var(--fg-heading)] tracking-tight">reading log</h1>
          {loggable.length > 0 && (
            <p className="text-xs text-stone-400 mt-3">{loggable.length} books · {months.length} months</p>
          )}
        </div>

        {/* currently reading */}
        <div className="mb-10">
          <p className="section-label mb-3">currently reading</p>
          {activeBooks.length > 0 && (
            <div className="space-y-0.5 mb-1">
              {activeBooks.map((e) => (
                <BookCard key={e.id} entry={e} />
              ))}
            </div>
          )}
          <CatalogSearch
            value={addValue}
            onChange={setAddValue}
            onSelect={(s) => addBook(s)}
            onSubmit={() => addBook()}
            placeholder="start reading..."
            disabled={adding}
          />
          {addValue.trim() && !adding && (
            <p className="hint-text">↵ to add · esc to cancel</p>
          )}
        </div>

        {loggable.length === 0 ? (
          <p className="text-xs text-stone-400">nothing logged yet.</p>
        ) : (
          <>
            {/* table of contents */}
            <div className="mb-12">
              <p className="section-label mb-4">contents</p>
              <div className="space-y-1">
                {months.map((key, i) => (
                  <a key={key} href={`#${sectionId(key)}`} className="flex items-baseline gap-3 py-1.5 -mx-3 px-3 rounded hover:bg-stone-100/60 transition-colors group">
                    <span className="text-xs text-stone-300 w-6 shrink-0 font-mono">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-xs text-stone-500 group-hover:text-stone-800 transition-colors">{monthLabel(key)}</span>
                    <span className="dot-leader" />
                    <span className="text-xs text-stone-300 shrink-0">{grouped[key].length}</span>
                  </a>
                ))}
              </div>
            </div>

            <hr className="border-stone-200 mb-12" />

            {/* monthly chapters */}
            <div className="space-y-14">
              {months.map((key, i) => (
                <section key={key} id={sectionId(key)}>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-xs text-stone-300 font-mono">{String(i + 1).padStart(2, "0")}</span>
                    <h2 className="text-sm font-semibold text-stone-700 tracking-wider uppercase">{monthLabel(key)}</h2>
                    <span className="flex-1 border-b border-dotted border-stone-200 mb-0.5" />
                    <span className="text-xs text-stone-300">{grouped[key].length}</span>
                  </div>
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
