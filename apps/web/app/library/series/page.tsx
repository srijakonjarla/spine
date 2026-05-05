"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getSeries,
  createSeries,
  type Series,
  type SeriesBook,
} from "@/lib/series";
import { getEntries } from "@/lib/db";
import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonRoot, SkeletonBlock } from "@/components/Skeleton";
import type { BookEntry } from "@/types";
import SeriesCard from "@/components/series/SeriesCard";

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [library, setLibrary] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getSeries(), getEntries()])
      .then(([series, books]) => {
        setSeriesList(series);
        setLibrary(books);
      })
      .catch(() => toast("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createSeries(newName.trim(), newAuthor.trim());
      setSeriesList((prev) => [created, ...prev]);
      setNewName("");
      setNewAuthor("");
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) =>
    setSeriesList((prev) => prev.filter((s) => s.id !== id));

  const handleUpdate = (
    id: string,
    patch: { name?: string; author?: string },
  ) => {
    setSeriesList((prev) =>
      prev.map((s) => (s.id !== id ? s : { ...s, ...patch })),
    );
  };

  const handleBookStatusChange = (
    seriesId: string,
    bookId: string,
    status: SeriesBook["status"],
  ) => {
    setSeriesList((prev) =>
      prev.map((s) =>
        s.id !== seriesId
          ? s
          : {
              ...s,
              books: s.books.map((b) =>
                b.id === bookId ? { ...b, status } : b,
              ),
            },
      ),
    );
  };

  const handleBookDelete = (seriesId: string, bookId: string) => {
    setSeriesList((prev) =>
      prev.map((s) =>
        s.id !== seriesId
          ? s
          : { ...s, books: s.books.filter((b) => b.id !== bookId) },
      ),
    );
  };

  const handleBookAdd = (seriesId: string, book: SeriesBook) => {
    setSeriesList((prev) =>
      prev.map((s) =>
        s.id !== seriesId ? s : { ...s, books: [...s.books, book] },
      ),
    );
  };

  const handleBooksReorder = (seriesId: string, books: SeriesBook[]) => {
    setSeriesList((prev) =>
      prev.map((s) => (s.id !== seriesId ? s : { ...s, books })),
    );
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/library" className="back-link">
            ← library
          </Link>
        </div>

        <PageHeader
          title="series tracker"
          subtitle={
            !loading && seriesList.length > 0
              ? `${seriesList.length} series`
              : undefined
          }
        />

        {loading && (
          <SkeletonRoot className="space-y-4">
            {[0, 1].map((i) => (
              <SkeletonBlock key={i} className="h-40" />
            ))}
          </SkeletonRoot>
        )}

        {!loading && seriesList.length === 0 && !showAdd && (
          <EmptyState message="No series tracked yet." />
        )}

        {!loading && (
          <div className="space-y-4 mb-6">
            {seriesList.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                library={library}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onBookStatusChange={handleBookStatusChange}
                onBookDelete={handleBookDelete}
                onBookAdd={handleBookAdd}
                onBooksReorder={handleBooksReorder}
              />
            ))}
          </div>
        )}

        {showAdd ? (
          <form
            onSubmit={handleCreate}
            className="border border-line rounded-xl p-6 space-y-4"
          >
            <p className="section-label">new series</p>
            <div>
              <label className="text-xs text-fg-faint block mb-1">
                series name
              </label>
              <input
                id="series-new-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Stormlight Archive"
                autoFocus
                className="underline-input"
              />
            </div>
            <div>
              <label className="text-xs text-fg-faint block mb-1">author</label>
              <input
                id="series-new-author"
                type="text"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="Brandon Sanderson"
                className="underline-input"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!newName.trim() || saving}
                className="text-sm text-white bg-plum px-5 py-2 rounded-full hover:opacity-85 transition-opacity disabled:opacity-50"
              >
                {saving ? "saving..." : "add series"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setNewName("");
                  setNewAuthor("");
                }}
                className="text-sm text-fg-faint hover:text-fg-muted transition-colors px-4 py-2"
              >
                cancel
              </button>
            </div>
          </form>
        ) : (
          !loading && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs text-fg-faint hover:text-fg-muted transition-colors"
            >
              + add series
            </button>
          )
        )}
      </div>
    </div>
  );
}
