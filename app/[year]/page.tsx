"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getLists } from "@/lib/lists";
import { getReadingLog } from "@/lib/habits";
import type { BookList } from "@/types";

export default function YearPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [stats, setStats] = useState<{ books: number; finished: number; days: number } | null>(null);
  const [lists, setLists] = useState<BookList[]>([]);

  if (!/^\d{4}$/.test(yearParam)) notFound();

  useEffect(() => {
    Promise.all([getEntries({ year }), getLists(year), getReadingLog(year)])
      .then(([books, fetchedLists, log]) => {
        setStats({
          books: books.length,
          finished: books.filter((b) => b.status === "finished").length,
          days: log.length,
        });
        setLists(fetchedLists);
      })
      .catch(console.error);
  }, [year]);

  const chapters = [
    {
      num: "01",
      label: "reading log",
      href: `/${year}/books`,
      detail: stats ? `${stats.books} books` : null,
    },
    {
      num: "02",
      label: "habit tracker",
      href: `/${year}/habits`,
      detail: stats ? `${stats.days} days` : null,
    },
    {
      num: "03",
      label: "lists",
      href: `/${year}/lists`,
      detail: lists.length > 0 ? `${lists.length}` : null,
    },
    {
      num: "04",
      label: "year in review",
      href: `/${year}/stats`,
      detail: stats ? `${stats.finished} finished` : null,
    },
  ];

  return (
    <div className="page">
      <div className="page-content">

        {/* back */}
        <div className="mb-10">
          <Link href="/" className="back-link">← journals</Link>
        </div>

        {/* journal cover */}
        <div className="mb-10 pb-8 border-b border-stone-200">
          <p className="text-xs text-stone-300 mb-2 tracking-widest uppercase">reading journal</p>
          <h1 className="text-4xl font-semibold text-stone-900 tracking-tight">{year}</h1>
          {stats && (
            <p className="text-xs text-stone-400 mt-3">
              {stats.books} books tracked · {stats.finished} finished · {stats.days} days read
            </p>
          )}
        </div>

        {/* table of contents */}
        <div className="mb-8">
          <p className="section-label mb-5">contents</p>
          <div className="space-y-1">
            {chapters.map((ch) => (
              <Link key={ch.num} href={ch.href} className="flex items-baseline gap-3 py-2 -mx-3 px-3 rounded hover:bg-stone-100/60 transition-colors group">
                <span className="text-xs text-stone-300 w-6 shrink-0 font-mono">{ch.num}</span>
                <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">{ch.label}</span>
                <span className="dot-leader" />
                <span className="text-xs text-stone-300 shrink-0">{ch.detail ?? "—"}</span>
                <span className="text-xs text-stone-200 group-hover:text-stone-400 transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
