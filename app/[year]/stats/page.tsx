"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { getLists } from "@/lib/lists";
import { StarDisplay } from "@/components/StarDisplay";
import type { BookEntry, ListItem } from "@/types";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function effectiveMonth(e: BookEntry): number | null {
  const date = e.status === "finished" && e.dateFinished
    ? e.dateFinished
    : e.status === "did-not-finish" && e.dateShelved
    ? e.dateShelved
    : null;
  if (!date) return null;
  return new Date(date).getMonth();
}

function topN<T extends string>(items: T[], n: number): { value: T; count: number }[] {
  const counts = items.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value: value as T, count }));
}

function Bar({ value, max, label, sublabel }: { value: number; max: number; label: string; sublabel?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-stone-400 w-7 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-stone-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-stone-400 w-4 shrink-0">{value}</span>
      {sublabel && <span className="text-xs text-stone-300 truncate max-w-[120px]">{sublabel}</span>}
    </div>
  );
}

export default function StatsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [collectionItems, setCollectionItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getEntries({ year }),
      getLists(year),
    ]).then(([e, lists]) => {
      setEntries(e);
      const collection = lists.filter((l) => l.listType === "collection").flatMap((l) => l.items);
      setCollectionItems(collection);
    }).catch(console.error).finally(() => setLoading(false));
  }, [year]);

  const finished = entries.filter((e) => e.status === "finished");
  const rated = finished.filter((e) => e.rating > 0);
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, e) => sum + e.rating, 0) / rated.length).toFixed(1)
    : null;

  // monthly counts (finished + dnf)
  const monthlyCounts = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    count: entries.filter((e) => (e.status === "finished" || e.status === "did-not-finish") && effectiveMonth(e) === i).length,
  }));
  const maxMonthly = Math.max(...monthlyCounts.map((m) => m.count), 1);

  // top genres
  const allGenres = entries.flatMap((e) => e.genres);
  const topGenres = topN(allGenres, 5);
  const maxGenre = topGenres[0]?.count ?? 1;

  // top authors (finished books only)
  const allAuthors = finished.filter((e) => e.author).map((e) => e.author);
  const topAuthors = topN(allAuthors, 5);
  const maxAuthor = topAuthors[0]?.count ?? 1;

  // physical collection stats
  function parsePrice(item: ListItem): number {
    return parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0;
  }
  const bought  = collectionItems.filter((i) => i.type === "bought");
  const sold    = collectionItems.filter((i) => i.type === "sold");
  const donated = collectionItems.filter((i) => i.type === "donated");
  const totalSpent  = bought.reduce((sum, i) => sum + parsePrice(i), 0);
  const totalGained = sold.reduce((sum, i) => sum + parsePrice(i), 0);

  // highlights: top rated finished books
  const highlights = [...finished]
    .filter((e) => e.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  if (loading) return <div className="page" />;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href={`/${year}`} className="back-link">← {year}</Link>
        </div>

        <h1 className="page-title mb-1">{year} in review</h1>
        <p className="text-xs text-stone-400 mb-10">your year of reading</p>

        {/* headline numbers */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div>
            <p className="text-3xl font-semibold text-stone-900">{finished.length}</p>
            <p className="text-xs text-stone-400 mt-0.5">books finished</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-stone-900">{entries.length}</p>
            <p className="text-xs text-stone-400 mt-0.5">books tracked</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-stone-900">{avgRating ?? "—"}</p>
            <p className="text-xs text-stone-400 mt-0.5">avg rating</p>
          </div>
        </div>

        {/* monthly breakdown */}
        {finished.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">by month</p>
            <div className="space-y-2">
              {monthlyCounts.map(({ month, count }) => (
                <Bar key={month} label={MONTHS[month]} value={count} max={maxMonthly} />
              ))}
            </div>
          </div>
        )}

        {/* top genres */}
        {topGenres.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">genres</p>
            <div className="space-y-2">
              {topGenres.map(({ value, count }) => (
                <Bar key={value} label={String(count)} value={count} max={maxGenre} sublabel={value} />
              ))}
            </div>
          </div>
        )}

        {/* top authors */}
        {topAuthors.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">authors</p>
            <div className="space-y-2">
              {topAuthors.map(({ value, count }) => (
                <div key={value} className="flex items-baseline gap-3">
                  <span className="text-sm text-stone-700 truncate flex-1">{value}</span>
                  <span className="text-xs text-stone-300">{count} {count === 1 ? "book" : "books"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* highlights */}
        {highlights.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">highlights</p>
            <div className="space-y-3">
              {highlights.map((e) => (
                <Link key={e.id} href={`/book/${e.id}`} className="flex items-baseline gap-3 group">
                  <StarDisplay rating={e.rating} size={11} />
                  <span className="text-sm text-stone-800 group-hover:text-stone-600 transition-colors truncate">{e.title}</span>
                  {e.author && <span className="text-xs text-stone-400 shrink-0">{e.author}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* physical collection */}
        {collectionItems.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">physical collection</p>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-2xl font-semibold text-stone-900">{bought.length}</p>
                <p className="text-xs text-stone-400 mt-0.5">books bought</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-stone-900">{sold.length}</p>
                <p className="text-xs text-stone-400 mt-0.5">books sold</p>
              </div>
              {donated.length > 0 && (
                <div>
                  <p className="text-2xl font-semibold text-stone-900">{donated.length}</p>
                  <p className="text-xs text-stone-400 mt-0.5">books donated</p>
                </div>
              )}
              {totalSpent > 0 && (
                <div>
                  <p className="text-2xl font-semibold text-stone-900">${totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-stone-400 mt-0.5">spent</p>
                </div>
              )}
              {totalGained > 0 && (
                <div>
                  <p className="text-2xl font-semibold text-stone-900">${totalGained.toFixed(2)}</p>
                  <p className="text-xs text-stone-400 mt-0.5">gained back</p>
                </div>
              )}
            </div>
          </div>
        )}

        {finished.length === 0 && (
          <p className="text-xs text-stone-300">no finished books yet this year.</p>
        )}
      </div>
    </div>
  );
}
