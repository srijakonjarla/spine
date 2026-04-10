"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getSeries, createSeries, deleteSeries,
  addSeriesBook, updateSeriesBook, deleteSeriesBook,
  type Series, type SeriesBook,
} from "@/lib/series";

const STATUS_LABEL: Record<SeriesBook["status"], string> = {
  read: "read",
  reading: "reading",
  unread: "unread",
  skipped: "skipped",
};

const STATUS_COLOR: Record<SeriesBook["status"], string> = {
  read: "#7B9E87",
  reading: "#C97B5A",
  unread: "",
  skipped: "",
};

const STATUS_CYCLE: Record<SeriesBook["status"], SeriesBook["status"]> = {
  unread: "reading",
  reading: "read",
  read: "unread",
  skipped: "unread",
};

function SeriesCard({ series, onDelete, onBookStatusChange, onBookDelete }: {
  series: Series;
  onDelete: (id: string) => void;
  onBookStatusChange: (seriesId: string, bookId: string, status: SeriesBook["status"]) => void;
  onBookDelete: (seriesId: string, bookId: string) => void;
}) {
  const [addingBook, setAddingBook] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const readCount = series.books.filter((b) => b.status === "read").length;
  const total = series.books.length;

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim() || saving) return;
    setSaving(true);
    try {
      const next = total + 1;
      const book = await addSeriesBook(series.id, bookTitle.trim(), next);
      onBookStatusChange(series.id, book.id, book.status);
      setBookTitle("");
      setAddingBook(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${series.name}"?`)) return;
    setDeleting(true);
    try { await deleteSeries(series.id); onDelete(series.id); }
    catch (err) { console.error(err); setDeleting(false); }
  };

  const handleBookStatus = async (book: SeriesBook) => {
    const next = STATUS_CYCLE[book.status];
    onBookStatusChange(series.id, book.id, next);
    await updateSeriesBook(series.id, book.id, next);
  };

  const handleBookDelete = async (book: SeriesBook) => {
    onBookDelete(series.id, book.id);
    await deleteSeriesBook(series.id, book.id);
  };

  return (
    <div className="border border-stone-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[#2D1B2E]">{series.name}</h3>
          {series.author && <p className="text-xs text-stone-400 mt-0.5">{series.author}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-stone-400">{readCount}/{total}</span>
          <button onClick={handleDelete} disabled={deleting} className="text-xs text-stone-300 hover:text-red-400 transition-colors">
            delete
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(readCount / total) * 100}%`, background: "#7B9E87" }}
          />
        </div>
      )}

      {/* Books */}
      <div className="space-y-1 mb-4">
        {series.books.map((book) => (
          <div key={book.id} className="flex items-center gap-3 py-1 group">
            <span className="text-xs text-stone-300 w-5 shrink-0 font-mono">{book.position}.</span>
            <button
              onClick={() => handleBookStatus(book)}
              className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors"
              style={{
                background: book.status === "read" || book.status === "reading" ? STATUS_COLOR[book.status] : "transparent",
                borderColor: book.status === "read" || book.status === "reading" ? STATUS_COLOR[book.status] : "#d6d3d1",
              }}
              title={`Mark as ${STATUS_CYCLE[book.status]}`}
            >
              {book.status === "read" && <span className="text-white text-[8px]">✓</span>}
              {book.status === "reading" && <span style={{ color: "white", fontSize: 8 }}>○</span>}
            </button>
            <span
              className="flex-1 text-sm truncate"
              style={{ color: book.status === "read" ? "#a8a29e" : "var(--fg)", textDecoration: book.status === "skipped" ? "line-through" : "none" }}
            >
              {book.title}
            </span>
            <span
              className="text-xs shrink-0"
              style={{ color: STATUS_COLOR[book.status] || "#a8a29e" }}
            >
              {book.status !== "unread" ? STATUS_LABEL[book.status] : ""}
            </span>
            <button
              onClick={() => handleBookDelete(book)}
              className="text-xs text-stone-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add book */}
      {addingBook ? (
        <form onSubmit={handleAddBook} className="flex gap-2 items-center mt-2">
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder={`Book ${total + 1} title...`}
            autoFocus
            className="flex-1 bg-transparent border-b border-stone-300 pb-0.5 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:border-stone-600 transition-colors"
          />
          <button type="submit" disabled={!bookTitle.trim() || saving} className="text-xs text-stone-600 hover:text-stone-900 transition-colors">
            add
          </button>
          <button type="button" onClick={() => { setAddingBook(false); setBookTitle(""); }} className="text-xs text-stone-300 hover:text-stone-600 transition-colors">
            cancel
          </button>
        </form>
      ) : (
        <button onClick={() => setAddingBook(true)} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
          + add book
        </button>
      )}
    </div>
  );
}

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSeries().then(setSeriesList).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createSeries(newName.trim(), newAuthor.trim());
      setSeriesList((prev) => [created, ...prev]);
      setNewName("");
      setNewAuthor("");
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  const handleDelete = (id: string) => setSeriesList((prev) => prev.filter((s) => s.id !== id));

  const handleBookStatusChange = (seriesId: string, bookId: string, status: SeriesBook["status"]) => {
    setSeriesList((prev) => prev.map((s) =>
      s.id !== seriesId ? s : {
        ...s,
        books: s.books.some((b) => b.id === bookId)
          ? s.books.map((b) => b.id === bookId ? { ...b, status } : b)
          : [...s.books, { id: bookId, title: "", position: s.books.length + 1, status, bookId: null }],
      }
    ));
  };

  const handleBookDelete = (seriesId: string, bookId: string) => {
    setSeriesList((prev) => prev.map((s) =>
      s.id !== seriesId ? s : { ...s, books: s.books.filter((b) => b.id !== bookId) }
    ));
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/library" className="back-link">← library</Link>
        </div>

        <div className="mb-10 pb-8 border-b border-stone-200">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold page-title tracking-tight">series tracker</h1>
          {!loading && seriesList.length > 0 && (
            <p className="text-xs text-stone-400 mt-3">{seriesList.length} series</p>
          )}
        </div>

        {loading && (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-40 bg-stone-100 rounded-xl" />)}
          </div>
        )}

        {!loading && seriesList.length === 0 && !showAdd && (
          <p className="text-xs text-stone-400 mb-6">No series tracked yet.</p>
        )}

        {!loading && (
          <div className="space-y-4 mb-6">
            {seriesList.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                onDelete={handleDelete}
                onBookStatusChange={handleBookStatusChange}
                onBookDelete={handleBookDelete}
              />
            ))}
          </div>
        )}

        {showAdd ? (
          <form onSubmit={handleCreate} className="border border-stone-200 rounded-xl p-6 space-y-4">
            <p className="section-label">new series</p>
            <div>
              <label className="text-xs text-stone-400 block mb-1">series name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Stormlight Archive"
                autoFocus
                className="w-full bg-transparent border-b border-stone-200 pb-1 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">author</label>
              <input
                type="text"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="Brandon Sanderson"
                className="w-full bg-transparent border-b border-stone-200 pb-1 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={!newName.trim() || saving} className="text-sm text-white bg-stone-900 px-5 py-2 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50">
                {saving ? "saving..." : "add series"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setNewName(""); setNewAuthor(""); }} className="text-sm text-stone-400 hover:text-stone-700 transition-colors px-4 py-2">
                cancel
              </button>
            </div>
          </form>
        ) : (
          !loading && (
            <button onClick={() => setShowAdd(true)} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
              + add series
            </button>
          )
        )}
      </div>
    </div>
  );
}
