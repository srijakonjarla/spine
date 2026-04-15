"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  getSeries, createSeries, updateSeries, deleteSeries,
  addSeriesBook, updateSeriesBook, deleteSeriesBook, reorderSeriesBooks,
  type Series, type SeriesBook,
} from "@/lib/series";
import { useDragReorder } from "@/hooks/useDragReorder";
import { getEntries } from "@/lib/db";
import { CatalogSearch } from "@/components/CatalogSearch";
import { BookCoverThumb } from "@/components/BookCover";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { type CatalogEntry } from "@/lib/catalog";
import type { BookEntry } from "@/types";

const STATUS_BG_CLS: Record<SeriesBook["status"], string> = {
  read:    "bg-sage border-sage",
  reading: "bg-terra border-terra",
  unread:  "bg-transparent border-[var(--border-stone-300)]",
  skipped: "bg-transparent border-[var(--border-stone-300)]",
};

const STATUS_TEXT_CLS: Record<SeriesBook["status"], string> = {
  read:    "text-sage",
  reading: "text-terra",
  unread:  "text-stone-400",
  skipped: "text-stone-400",
};

const STATUS_CYCLE: Record<SeriesBook["status"], SeriesBook["status"]> = {
  unread: "reading",
  reading: "read",
  read: "unread",
  skipped: "unread",
};

function matchLibraryBook(seriesBook: SeriesBook, library: BookEntry[]): BookEntry | undefined {
  // Match by linked bookId first, then fall back to title (case-insensitive)
  if (seriesBook.bookId) return library.find((b) => b.id === seriesBook.bookId);
  return library.find((b) => b.title.toLowerCase() === seriesBook.title.toLowerCase());
}

function SeriesCard({
  series,
  library,
  onDelete,
  onUpdate,
  onBookStatusChange,
  onBookDelete,
  onBookAdd,
  onBooksReorder,
}: {
  series: Series;
  library: BookEntry[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { name?: string; author?: string }) => void;
  onBookStatusChange: (seriesId: string, bookId: string, status: SeriesBook["status"]) => void;
  onBookDelete: (seriesId: string, bookId: string) => void;
  onBookAdd: (seriesId: string, book: SeriesBook) => void;
  onBooksReorder: (seriesId: string, books: SeriesBook[]) => void;
}) {
  const [name, setName] = useState(series.name);
  const [author, setAuthor] = useState(series.author);
  const [addingBook, setAddingBook] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { draggingId, itemProps } = useDragReorder(series.books, (reordered) => {
    onBooksReorder(series.id, reordered);
    reorderSeriesBooks(series.id, reordered.map((b) => b.id));
  });

  const handleFieldChange = (patch: { name?: string; author?: string }) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.author !== undefined) setAuthor(patch.author);
    onUpdate(series.id, patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateSeries(series.id, patch), 600);
  };

  const readCount = series.books.filter((b) => b.status === "read").length;
  const total = series.books.length;

  const handleAddBook = async (catalog?: CatalogEntry) => {
    const title = (catalog?.title ?? draftTitle).trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      const libraryStatus = catalog?.status;
      const initialStatus: SeriesBook["status"] | undefined =
        libraryStatus === "finished" ? "read" :
        libraryStatus === "reading"  ? "reading" :
        undefined;
      const catalogMeta = catalog ? {
        coverUrl: catalog.coverUrl,
        author: catalog.author,
        isbn: catalog.isbn,
        releaseDate: catalog.releaseDate,
        genres: catalog.genres,
        pageCount: catalog.pageCount,
        bookId: catalog.bookId,
      } : undefined;
      const book = await addSeriesBook(series.id, title, total + 1, catalogMeta, initialStatus);
      onBookAdd(series.id, book);
      setDraftTitle("");
      setAddingBook(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
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
    <div className="border border-[var(--border-light)] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={name}
            onChange={(e) => handleFieldChange({ name: e.target.value })}
            placeholder="series name"
            className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[var(--fg-heading)] bg-transparent border-none outline-none w-full placeholder:text-[var(--fg-faint)]"
          />
          <input
            type="text"
            value={author}
            onChange={(e) => handleFieldChange({ author: e.target.value })}
            placeholder="author"
            className="text-xs text-[var(--fg-faint)] bg-transparent border-none outline-none w-full mt-0.5 placeholder:text-[var(--fg-faint)]/50"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[var(--fg-faint)]">{readCount}/{total}</span>
          <button onClick={handleDelete} disabled={deleting} className="text-xs text-[var(--fg-faint)] hover:text-red-400 transition-colors">
            delete
          </button>
        </div>
      </div>

      {total > 0 && <ProgressBar value={readCount / total} size="xs" className="mb-4" />}

      {/* Books */}
      <div className="space-y-1.5 mb-4">
        {series.books.map((book, index) => {
          const libraryBook = matchLibraryBook(book, library);
          return (
            <div
              key={book.id}
              className={`flex items-center gap-3 py-1 group transition-opacity ${draggingId === book.id ? "opacity-40" : ""}`}
              {...itemProps(index, book.id)}
            >
              <span className="cursor-grab active:cursor-grabbing text-[var(--fg-faint)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none">⠿</span>
              <span className="text-xs text-[var(--fg-faint)] w-5 shrink-0 font-mono">{index + 1}.</span>

              {/* Cover thumbnail */}
              <BookCoverThumb coverUrl={book.coverUrl} title={book.title} />

              {/* Status dot */}
              <button
                onClick={() => handleBookStatus(book)}
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${STATUS_BG_CLS[book.status]}`}
                title={`Mark as ${STATUS_CYCLE[book.status]}`}
              >
                {book.status === "read"    && <span className="text-white text-[8px]">✓</span>}
                {book.status === "reading" && <span className="text-white text-[8px]">○</span>}
              </button>

              {/* Title */}
              <span className={`flex-1 text-sm truncate ${book.status === "read" ? "text-[var(--fg-faint)]" : "text-[var(--fg)]"} ${book.status === "skipped" ? "line-through" : ""}`}>
                {book.title}
              </span>

              {/* Library cross-reference badge */}
              {libraryBook && (
                <Link
                  href={`/book/${libraryBook.id}`}
                  className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full border transition-colors ${STATUS_TEXT_CLS[book.status]} border-current hover:opacity-70`}
                  title="View in your library"
                >
                  {libraryBook.status === "finished" ? "read" : libraryBook.status === "reading" ? "reading" : "tbr"}
                </Link>
              )}

              {/* Status label */}
              {!libraryBook && book.status !== "unread" && (
                <span className={`text-xs shrink-0 ${STATUS_TEXT_CLS[book.status]}`}>
                  {book.status}
                </span>
              )}

              <button
                onClick={() => handleBookDelete(book)}
                className="text-xs text-[var(--fg-faint)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Add book via catalog */}
      {addingBook ? (
        <div className="mt-2">
          <CatalogSearch
            value={draftTitle}
            onChange={setDraftTitle}
            onSelect={(s) => handleAddBook(s)}
            onSubmit={() => handleAddBook()}
            placeholder={`Book ${total + 1} title or ISBN...`}
            disabled={saving}
            libraryEntries={library}
          />
          {draftTitle.trim() && !saving && (
            <p className="text-[11px] text-[var(--fg-faint)] mt-1">↵ to add without catalog match</p>
          )}
          <button
            type="button"
            onClick={() => { setAddingBook(false); setDraftTitle(""); }}
            className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors mt-2"
          >
            cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setAddingBook(true)} className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors">
          + add book
        </button>
      )}
    </div>
  );
}

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
      .then(([series, books]) => { setSeriesList(series); setLibrary(books); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createSeries(newName.trim(), newAuthor.trim());
      setSeriesList((prev) => [created, ...prev]);
      setNewName(""); setNewAuthor(""); setShowAdd(false);
    } finally { setSaving(false); }
  };

  const handleDelete = (id: string) => setSeriesList((prev) => prev.filter((s) => s.id !== id));

  const handleUpdate = (id: string, patch: { name?: string; author?: string }) => {
    setSeriesList((prev) => prev.map((s) => s.id !== id ? s : { ...s, ...patch }));
  };

  const handleBookStatusChange = (seriesId: string, bookId: string, status: SeriesBook["status"]) => {
    setSeriesList((prev) => prev.map((s) =>
      s.id !== seriesId ? s : { ...s, books: s.books.map((b) => b.id === bookId ? { ...b, status } : b) }
    ));
  };

  const handleBookDelete = (seriesId: string, bookId: string) => {
    setSeriesList((prev) => prev.map((s) =>
      s.id !== seriesId ? s : { ...s, books: s.books.filter((b) => b.id !== bookId) }
    ));
  };

  const handleBookAdd = (seriesId: string, book: SeriesBook) => {
    setSeriesList((prev) => prev.map((s) =>
      s.id !== seriesId ? s : { ...s, books: [...s.books, book] }
    ));
  };

  const handleBooksReorder = (seriesId: string, books: SeriesBook[]) => {
    setSeriesList((prev) => prev.map((s) =>
      s.id !== seriesId ? s : { ...s, books }
    ));
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/library" className="back-link">← library</Link>
        </div>

        <PageHeader
          title="series tracker"
          subtitle={!loading && seriesList.length > 0 ? `${seriesList.length} series` : undefined}
        />

        {loading && (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-40 bg-[var(--bg-hover)] rounded-xl" />)}
          </div>
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
          <form onSubmit={handleCreate} className="border border-[var(--border-light)] rounded-xl p-6 space-y-4">
            <p className="section-label">new series</p>
            <div>
              <label className="text-xs text-[var(--fg-faint)] block mb-1">series name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Stormlight Archive"
                autoFocus
                className="underline-input"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--fg-faint)] block mb-1">author</label>
              <input
                type="text"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="Brandon Sanderson"
                className="underline-input"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={!newName.trim() || saving} className="text-sm text-white bg-[var(--plum)] px-5 py-2 rounded-full hover:opacity-85 transition-opacity disabled:opacity-50">
                {saving ? "saving..." : "add series"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setNewName(""); setNewAuthor(""); }} className="text-sm text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors px-4 py-2">
                cancel
              </button>
            </div>
          </form>
        ) : (
          !loading && (
            <button onClick={() => setShowAdd(true)} className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors">
              + add series
            </button>
          )
        )}
      </div>
    </div>
  );
}
