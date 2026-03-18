"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { getEntries } from "../lib/db";
import { getLists } from "../lib/lists";
import { getReadingLog } from "../lib/habits";

export default function YearPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [stats, setStats] = useState<{
    books: number;
    finished: number;
    lists: number;
    days: number;
  } | null>(null);

  if (!/^\d{4}$/.test(yearParam)) notFound();

  useEffect(() => {
    Promise.all([getEntries(year), getLists(year), getReadingLog(year)])
      .then(([books, lists, log]) => {
        setStats({
          books: books.length,
          finished: books.filter((b) => b.status === "finished").length,
          lists: lists.length,
          days: log.length,
        });
      })
      .catch(console.error);
  }, [year]);

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/" className="back-link">
            ← index
          </Link>
        </div>

        <h1 className="page-title mb-8">{year}</h1>

        <div className="space-y-1 mb-12">
          <Link href={`/${year}/books`} className="row-item group">
            <span className="text-xs text-stone-300">○</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">reading log</span>
            <span className="dot-leader" />
            <span className="text-xs text-stone-400">{stats ? `${stats.books} books` : "—"}</span>
          </Link>
          <Link href={`/${year}/lists`} className="row-item group">
            <span className="text-xs text-stone-300">○</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">lists</span>
            <span className="dot-leader" />
            <span className="text-xs text-stone-400">{stats ? `${stats.lists} lists` : "—"}</span>
          </Link>
          <Link href={`/${year}/habits`} className="row-item group">
            <span className="text-xs text-stone-300">○</span>
            <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">habit tracker</span>
            <span className="dot-leader" />
            <span className="text-xs text-stone-400">{stats ? `${stats.days} days` : "—"}</span>
          </Link>
        </div>

        {stats && (
          <div className="border-t border-stone-200 pt-6">
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">at a glance</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xl font-semibold text-stone-800">{stats.books}</p>
                <p className="text-xs text-stone-400">books tracked</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-stone-800">{stats.finished}</p>
                <p className="text-xs text-stone-400">finished</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-stone-800">{stats.days}</p>
                <p className="text-xs text-stone-400">days read</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
