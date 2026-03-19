"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { getEntries } from "../lib/db";
import { getLists } from "../lib/lists";
import { getReadingLog } from "../lib/habits";
import { StatBlock } from "../components/StatBlock";
import { BookmarkSection } from "../components/BookmarkSection";
import type { BookList } from "../types";

export default function YearPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [stats, setStats] = useState<{ books: number; finished: number; days: number } | null>(null);
  const [lists, setLists] = useState<BookList[]>([]);
  const [bookmarkedBooks, setBookmarkedBooks] = useState<{ id: string; title: string }[]>([]);

  if (!/^\d{4}$/.test(yearParam)) notFound();

  useEffect(() => {
    Promise.all([getEntries(year), getLists(year), getReadingLog(year)])
      .then(([books, fetchedLists, log]) => {
        setStats({
          books: books.length,
          finished: books.filter((b) => b.status === "finished").length,
          days: log.length,
        });
        setLists(fetchedLists);
        setBookmarkedBooks(books.filter((b) => b.bookmarked).map((b) => ({ id: b.id, title: b.title })));
      })
      .catch(console.error);
  }, [year]);

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/" className="back-link">← home</Link>
        </div>

        <h1 className="page-title mb-8">{year}</h1>

        <div className="space-y-1 mb-8">
          {/* reading log */}
          <Link href={`/${year}/books`} className="row-item group">
            <span className="text-xs text-stone-300">○</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">reading log</span>
            <span className="dot-leader" />
            <span className="text-xs text-stone-400">{stats ? `${stats.books} books` : "—"}</span>
          </Link>

          {/* lists */}
          <Link href={`/${year}/lists`} className="row-item group">
            <span className="text-xs text-stone-300">○</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">lists</span>
            <span className="dot-leader" />
            <span className="text-xs text-stone-400">{lists.length}</span>
          </Link>

          {/* habit tracker */}
          <Link href={`/${year}/habits`} className="row-item group">
            <span className="text-xs text-stone-300">○</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">habit tracker</span>
            <span className="dot-leader" />
            <span className="text-xs text-stone-400">{stats ? `${stats.days} days` : "—"}</span>
          </Link>

          {/* stats */}
          <Link href={`/${year}/stats`} className="row-item group">
            <span className="text-xs text-stone-300">○</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">year in review</span>
            <span className="dot-leader" />
          </Link>
        </div>

        <BookmarkSection books={bookmarkedBooks} lists={lists} year={year} />

        {stats && (
          <div className="border-t border-stone-200 pt-6">
            <p className="section-label mb-3">at a glance</p>
            <div className="grid grid-cols-3 gap-4">
              <StatBlock value={stats.books} label="books tracked" />
              <StatBlock value={stats.finished} label="finished" />
              <StatBlock value={stats.days} label="days read" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
