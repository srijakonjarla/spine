"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getReadingLog } from "@/lib/habits";
import { getDisplayName, hasImportedGoodreads } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { StarDisplay } from "@/components/StarDisplay";
import type { BookEntry } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = `${CURRENT_YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 17) return "good afternoon";
  return "good evening";
}

export default function Home() {
  const { user } = useAuth();
  const [reading, setReading] = useState<BookEntry[]>([]);
  const [recentlyFinished, setRecentlyFinished] = useState<BookEntry[]>([]);
  const [daysThisMonth, setDaysThisMonth] = useState(0);
  const [archivedYears, setArchivedYears] = useState<{ year: number; books: number; days: number }[]>([]);
  const [goodreadsImported, setGoodreadsImported] = useState(true);

  useEffect(() => {
    async function load() {
      const [allBooks, log] = await Promise.all([
        getEntries(),
        getReadingLog(CURRENT_YEAR),
      ]);

      setReading(allBooks.filter((b) => b.status === "reading"));

      const finished = allBooks
        .filter((b) => b.status === "finished" && b.dateFinished)
        .sort((a, b) => b.dateFinished!.localeCompare(a.dateFinished!));
      setRecentlyFinished(finished.slice(0, 4));

      const monthDays = log.filter((e) => e.logDate.startsWith(CURRENT_MONTH)).length;
      setDaysThisMonth(monthDays);

      // Build archive years
      const yearSet = new Set<number>();
      allBooks.forEach((b) => {
        const d = b.dateFinished || b.dateStarted || b.createdAt;
        yearSet.add(new Date(d).getFullYear());
      });
      const years = Array.from(yearSet).filter((y) => y !== CURRENT_YEAR).sort((a, b) => b - a);
      const archive = years.map((year) => ({
        year,
        books: allBooks.filter((b) => {
          const d = b.dateFinished || b.dateStarted || b.createdAt;
          return new Date(d).getFullYear() === year;
        }).length,
        days: log.filter((e) => e.logDate.startsWith(`${year}-`)).length,
      }));
      setArchivedYears(archive);
    }
    load().catch(console.error);
    hasImportedGoodreads().then(setGoodreadsImported);
  }, []);

  const name = user ? getDisplayName(user) : "";
  const finishedThisYear = recentlyFinished.filter((b) =>
    b.dateFinished?.startsWith(`${CURRENT_YEAR}`)
  ).length;

  return (
    <div className="page">
      <div className="page-content">

        {/* Greeting */}
        <div className="mb-10">
          <p className="font-[family-name:var(--font-caveat)] text-xl" style={{ color: "var(--fg-muted)" }}>
            {greeting()}{name ? `, ${name}` : ""} ✦
          </p>
          <Link
            href={`/${CURRENT_YEAR}/spread`}
            className="font-[family-name:var(--font-playfair)] text-3xl font-semibold tracking-tight mt-1 block hover:opacity-80 transition-opacity"
            style={{ color: "var(--fg-heading)" }}
          >
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Link>
          <p className="text-xs mt-2" style={{ color: "var(--fg-faint)" }}>
            {finishedThisYear} books finished this year
            {daysThisMonth > 0 && ` · ${daysThisMonth} days read this month`}
          </p>
        </div>

        {/* Currently reading */}
        {reading.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">on the nightstand</p>
            <div className="space-y-3">
              {reading.map((book) => (
                <Link key={book.id} href={`/book/${book.id}`} className="block group">
                  <div
                    className="flex gap-4 p-4 rounded-2xl transition-opacity group-hover:opacity-90"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--fg-heading)" }}>
                        {book.title}
                      </p>
                      {book.author && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>
                          {book.author}
                        </p>
                      )}
                      {book.moodTags.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {book.moodTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="mb-10 grid grid-cols-2 gap-3">
          <Link
            href={`/${CURRENT_YEAR}/spread`}
            className="p-4 rounded-2xl transition-colors hover:opacity-90"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--fg-faint)" }}>spread</p>
            <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>this month →</p>
          </Link>
          <Link
            href={`/${CURRENT_YEAR}/stats`}
            className="p-4 rounded-2xl transition-colors hover:opacity-90"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--fg-faint)" }}>year</p>
            <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>{CURRENT_YEAR} in review →</p>
          </Link>
        </div>

        {/* Recently finished */}
        {recentlyFinished.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">recently finished</p>
            <div className="space-y-2">
              {recentlyFinished.map((book) => (
                <Link key={book.id} href={`/book/${book.id}`} className="flex items-center gap-3 group py-1.5 -mx-1 px-1 rounded-lg hover:bg-[rgba(45,27,46,0.04)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--fg)" }}>{book.title}</p>
                    {book.author && <p className="text-xs truncate" style={{ color: "var(--fg-faint)" }}>{book.author}</p>}
                  </div>
                  {book.rating > 0 && <StarDisplay rating={book.rating} />}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Archive */}
        {archivedYears.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">archive</p>
            <div className="space-y-0.5">
              {archivedYears.map((j) => (
                <Link
                  key={j.year}
                  href={`/${j.year}`}
                  className="flex items-baseline gap-3 py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-[rgba(45,27,46,0.04)] transition-colors group"
                >
                  <span className="text-sm font-semibold w-12 shrink-0" style={{ color: "var(--fg-muted)" }}>{j.year}</span>
                  <span className="dot-leader" />
                  <span className="text-xs shrink-0" style={{ color: "var(--fg-faint)" }}>{j.books} books · {j.days}d</span>
                  <span className="text-xs" style={{ color: "var(--fg-faint)" }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t space-y-2" style={{ borderColor: "var(--border-light)" }}>
          <div><Link href="/library" className="back-link">library →</Link></div>
          {!goodreadsImported && <div><Link href="/import" className="back-link">import from goodreads →</Link></div>}
        </div>
      </div>
    </div>
  );
}
