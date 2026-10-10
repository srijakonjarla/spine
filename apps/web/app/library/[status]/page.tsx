"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { createEntry } from "@/lib/db";
import { useEntriesByStatus } from "@/lib/hooks";
import { type CatalogEntry, lookupBook } from "@/lib/catalog";
import { toast } from "@/lib/toast";
import { CatalogSearch } from "@/components/CatalogSearch";
import { STATUS_LABEL } from "@/lib/statusMeta";
import { StarDisplay } from "@/components/StarDisplay";
import { BookCoverThumb } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRoot, SkeletonGrid } from "@/components/Skeleton";
import type { BookEntry } from "@/types";
import { localDateStr } from "@/lib/dates";
import {
  EMPTY_LIBRARY_FILTERS,
  hasActiveFilters,
  libraryFilterOptions,
  matchesLibraryFilters,
  sortBooks,
  type LibraryFilterState,
  type LibrarySort,
} from "@spine/shared";
import { LibraryControls } from "@/components/library/LibraryControls";

const VALID_STATUSES = new Set([
  "reading",
  "finished",
  "want-to-read",
  "did-not-finish",
]);

export default function StatusCatalogPage() {
  const { status } = useParams<{ status: string }>();
  const isValidStatus = VALID_STATUSES.has(status);
  const {
    data: fetched,
    isLoading,
    error,
    mutate: mutateEntries,
  } = useEntriesByStatus(isValidStatus ? status : undefined);
  const entries = fetched ?? [];
  const loading = isLoading;
  const [filters, setFilters] = useState<LibraryFilterState>(
    EMPTY_LIBRARY_FILTERS,
  );
  const [sort, setSort] = useState<LibrarySort>("date-desc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [addValue, setAddValue] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (error) toast("Failed to load data. Please refresh.");
  }, [error]);

  if (!isValidStatus) notFound();

  const addBook = async (catalog?: CatalogEntry) => {
    const title = (catalog?.title ?? addValue).trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const enriched = catalog ?? (await lookupBook(title));
      const now = new Date();
      const today = localDateStr(now);
      const entry: BookEntry = {
        id: crypto.randomUUID(),
        catalogBookId: "",
        hardcoverBookId: enriched?.hardcoverBookId ?? null,
        title: enriched?.title ?? title,
        author: enriched?.author ?? "",
        releaseDate: enriched?.releaseDate ?? "",
        genres: enriched?.genres ?? [],
        userGenres: [],
        moodTags: [],
        bookshelves: [],
        upNext: false,
        status: status as BookEntry["status"],
        dateStarted: status === "reading" ? today : "",
        dateFinished: status === "finished" ? today : "",
        dateShelved: status === "want-to-read" ? today : "",
        dateDnfed: status === "did-not-finish" ? today : "",
        rating: 0,
        feeling: "",
        thoughts: [],
        reads: [],
        bookmarked: false,
        publisher: enriched?.publisher ?? "",
        diversityTags: enriched?.diversityTags ?? [],
        userDiversityTags: [],
        format: "",
        audioDurationMinutes: enriched?.audioDurationMinutes ?? null,
        coverUrl: enriched?.coverUrl ?? "",
        isbn: enriched?.isbn ?? "",
        pageCount: enriched?.pageCount ?? null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      const { id } = await createEntry(entry);
      const saved = { ...entry, id };
      mutateEntries((prev) => (prev ? [saved, ...prev] : [saved]), {
        revalidate: false,
      });
      setAddValue("");
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setAdding(false);
    }
  };

  const options = libraryFilterOptions(entries);
  const upNext = entries.filter((e) => e.upNext);
  const filtering = hasActiveFilters(filters);
  const filtered = sortBooks(
    entries.filter((e) => matchesLibraryFilters(e, filters)),
    sort,
  );

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/library" className="back-link">
            ← library
          </Link>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <h1 className="page-title">{STATUS_LABEL[status]}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("grid")}
              className={`text-xs px-2 py-1 rounded transition-colors ${view === "grid" ? "bg-hover text-fg" : "bg-transparent text-fg-faint"}`}
            >
              ▦
            </button>
            <button
              onClick={() => setView("list")}
              className={`text-xs px-2 py-1 rounded transition-colors ${view === "list" ? "bg-hover text-fg" : "bg-transparent text-fg-faint"}`}
            >
              ☰
            </button>
          </div>
        </div>
        <p className="text-xs mb-8 text-fg-faint">{entries.length} books</p>

        {/* Add book */}
        <div className="mb-6">
          <CatalogSearch
            id="library-status-add"
            value={addValue}
            onChange={setAddValue}
            onSelect={(s) => addBook(s)}
            onSubmit={() => addBook()}
            placeholder={`add to ${STATUS_LABEL[status]?.toLowerCase() ?? status}...`}
            disabled={adding}
          />
          {addValue.trim() && !adding && <p className="hint-text">↵ to add</p>}
        </div>

        <LibraryControls
          id="library-status"
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          options={options}
          disabled={loading}
        />

        {/* Up next pinned section */}
        {!loading && upNext.length > 0 && !filtering && (
          <div className="mb-8 pb-8 border-b border-line">
            <p className="section-label mb-3">up next</p>
            <div className="space-y-0.5">
              {upNext.map((e) => (
                <Link
                  key={e.id}
                  href={`/book/${e.id}`}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-plum-trace transition-colors group"
                >
                  <BookCoverThumb
                    coverUrl={e.coverUrl}
                    title={e.title}
                    author={e.author}
                    width="w-6"
                    height="h-9"
                  />
                  <span className="text-sm truncate flex-1 text-fg">
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
          </div>
        )}

        {loading && (
          <SkeletonRoot>
            <SkeletonGrid count={12} />
          </SkeletonRoot>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState
            message={filtering ? "no books match." : "no books found."}
          />
        )}

        {!loading && filtered.length > 0 && view === "grid" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((e) => (
              <Link
                key={e.id}
                href={`/book/${e.id}`}
                className="group relative"
              >
                <div className="relative mb-2 rounded-lg overflow-hidden group-hover:opacity-85 transition-opacity h-32.5">
                  <BookCoverThumb
                    coverUrl={e.coverUrl}
                    title={e.title}
                    author={e.author}
                    width="w-full"
                    height="h-full"
                  />
                  {e.rating > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 text-detail text-gold drop-shadow">
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
        )}

        {!loading && filtered.length > 0 && view === "list" && (
          <div className="space-y-0.5">
            {filtered.map((e) => (
              <Link
                key={e.id}
                href={`/book/${e.id}`}
                className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-plum-trace transition-colors group"
              >
                <span className="text-sm truncate flex-1 text-fg">
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
    </div>
  );
}
