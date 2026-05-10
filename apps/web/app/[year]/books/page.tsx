"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookCoverThumb } from "@/components/BookCover";
import { StarDisplay } from "@/components/StarDisplay";
import { CatalogSearch } from "@/components/CatalogSearch";
import { createEntry } from "@/lib/db";
import { type CatalogEntry, lookupBook } from "@/lib/catalog";
import type { BookEntry } from "@/types";
import { localDateStr } from "@/lib/dates";
import { useYear } from "@/providers/YearContext";
import { useBooks } from "@/providers/BooksProvider";
import { toast } from "@/lib/toast";
import { YearBooksSkeleton } from "@/components/skeletons/YearBooksSkeleton";

function BookSection({
  label,
  books,
  view,
}: {
  label: string;
  books: BookEntry[];
  view: "grid" | "list";
}) {
  return (
    <div>
      <p className="section-label mb-3">{label}</p>
      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {books.map((e) => (
            <Link key={e.id} href={`/book/${e.id}`} className="group">
              <div className="relative mb-2 rounded-lg overflow-hidden group-hover:-translate-y-1 transition-transform h-32.5 shadow-sm">
                <BookCoverThumb
                  coverUrl={e.coverUrl}
                  title={e.title}
                  author={e.author}
                  width="w-full"
                  height="h-full"
                  size="lg"
                />
                {e.moodTags[0] && (
                  <span className="absolute top-1.5 left-1.5 z-10 text-label px-1.5 py-0.5 rounded-md bg-white/90 text-fg leading-none">
                    {e.moodTags[0]}
                  </span>
                )}
                {e.rating > 0 && (
                  <span className="absolute top-1.5 right-1.5 z-10 text-label px-1.5 py-0.5 rounded-md bg-black/40 text-gold leading-none tracking-tight">
                    {"★".repeat(Math.round(e.rating))}
                  </span>
                )}
              </div>
              <p className="text-caption font-medium leading-tight truncate text-fg">
                {e.title || "untitled"}
              </p>
              {e.author && (
                <p className="text-detail mt-0.5 truncate text-fg-faint">
                  {e.author}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          {books.map((e) => (
            <Link
              key={e.id}
              href={`/book/${e.id}`}
              className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-plum-trace transition-colors"
            >
              <BookCoverThumb
                coverUrl={e.coverUrl}
                title={e.title}
                width="w-6"
                height="h-9"
              />
              <span className="text-sm flex-1 truncate text-fg">
                {e.title || "untitled"}
              </span>
              {e.author && (
                <span className="text-xs shrink-0 hidden sm:block text-fg-faint">
                  {e.author}
                </span>
              )}
              <span className="dot-leader hidden sm:block" />
              {e.rating > 0 && <StarDisplay rating={e.rating} size={11} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BooksPage() {
  const { year, loading: yearLoading, yearEntries } = useYear();
  const { books, loading: booksLoading } = useBooks();
  const loading = yearLoading || booksLoading;
  const router = useRouter();
  const [addValue, setAddValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const activeBooks = books.filter((e) => e.status === "reading");

  const yearBooks = yearEntries;

  const filtered = yearBooks.filter(
    (e) =>
      !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase()),
  );

  const finished = filtered.filter((e) => e.status === "finished");
  const reading = filtered.filter((e) => e.status === "reading");
  const dnf = filtered.filter(
    (e) => e.status === "did-not-finish" && e.dateDnfed?.startsWith(`${year}`),
  );
  const wantToRead = filtered.filter((e) => e.status === "want-to-read");

  const addBook = async (catalog?: CatalogEntry) => {
    const title = (catalog?.title ?? addValue).trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const enriched = catalog ?? (await lookupBook(title));
      const now = new Date();
      const entry: BookEntry = {
        id: crypto.randomUUID(),
        catalogBookId: "",
        title: enriched?.title ?? title,
        author: enriched?.author ?? "",
        publisher: enriched?.publisher ?? "",
        releaseDate: enriched?.releaseDate ?? "",
        genres: enriched?.genres ?? [],
        userGenres: [],
        moodTags: [],
        diversityTags: enriched?.diversityTags ?? [],
        userDiversityTags: [],
        bookshelves: [],
        upNext: false,
        format: "",
        audioDurationMinutes: enriched?.audioDurationMinutes ?? null,
        status: "reading",
        dateStarted: localDateStr(now),
        dateFinished: "",
        dateShelved: "",
        dateDnfed: "",
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
    } catch {
      toast("something went wrong. please try again.");
      setAdding(false);
    }
  };

  if (loading) return <YearBooksSkeleton />;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/" className="back-link">
            ← home
          </Link>
        </div>

        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="page-title">{year} books</h1>
            {yearBooks.length > 0 && (
              <p className="text-xs text-fg-faint mt-1">
                {finished.length} finished
                {reading.length > 0 && ` · ${reading.length} reading`}
                {wantToRead.length > 0 &&
                  ` · ${wantToRead.length} want to read`}
                {dnf.length > 0 && ` · ${dnf.length} dnf`}
              </p>
            )}
          </div>
          {yearBooks.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("grid")}
                className={`text-xs px-2 py-1 rounded transition-colors ${view === "grid" ? "bg-hover text-fg" : "text-fg-faint"}`}
              >
                ▦
              </button>
              <button
                onClick={() => setView("list")}
                className={`text-xs px-2 py-1 rounded transition-colors ${view === "list" ? "bg-hover text-fg" : "text-fg-faint"}`}
              >
                ☰
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        {yearBooks.length > 0 && (
          <input
            id="year-books-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by title or author..."
            className="underline-input mb-6"
          />
        )}

        {/* Currently reading */}
        <div className="mb-8 pb-8 border-b border-line">
          <p className="section-label mb-3">currently reading</p>
          {activeBooks.length > 0 && (
            <div className="space-y-0.5 mb-3">
              {activeBooks.map((e) => (
                <Link
                  key={e.id}
                  href={`/book/${e.id}`}
                  className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-plum-trace transition-colors"
                >
                  <BookCoverThumb
                    coverUrl={e.coverUrl}
                    title={e.title}
                    width="w-6"
                    height="h-9"
                  />
                  <span className="text-sm flex-1 truncate text-fg">
                    {e.title}
                  </span>
                  {e.author && (
                    <span className="text-xs shrink-0 hidden sm:block text-fg-faint">
                      {e.author}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <CatalogSearch
            id="year-books-add"
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

        {/* Sectioned books */}
        {filtered.length === 0 ? (
          <p className="text-xs text-fg-faint">
            {search ? "no matches." : "no books logged yet."}
          </p>
        ) : (
          <div className="space-y-10">
            {finished.length > 0 && (
              <BookSection label="finished" books={finished} view={view} />
            )}
            {wantToRead.length > 0 && (
              <BookSection
                label="want to read"
                books={wantToRead}
                view={view}
              />
            )}
            {dnf.length > 0 && (
              <BookSection label="did not finish" books={dnf} view={view} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
