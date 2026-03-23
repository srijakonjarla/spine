"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getEntries, createEntry } from "@/lib/db";
import { findOrCreateCatalogEntry, type CatalogEntry } from "@/lib/catalog";
import { CatalogSearch } from "@/components/CatalogSearch";
import { StarDisplay } from "@/components/StarDisplay";
import { STATUS_LABEL, STATUS_SYMBOL, STATUS_COLOR, TRUNCATED_STATUSES, TRUNCATE_LIMIT } from "@/lib/statusMeta";
import type { BookEntry } from "@/types";

const ARCHIVED_STATUSES = ["finished", "did-not-finish"] as const;

// Inline collapsible add input — shows as a "+" link, expands on click
function InlineAdd({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (catalog?: CatalogEntry, raw?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  const handleAdd = async (catalog?: CatalogEntry) => {
    if (adding) return;
    setAdding(true);
    try {
      await onAdd(catalog, value);
      setValue("");
      setOpen(false);
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-stone-300 hover:text-stone-500 transition-colors mt-1"
      >
        + add
      </button>
    );
  }

  return (
    <div className="mt-2">
      <CatalogSearch
        value={value}
        onChange={setValue}
        onSelect={(s) => handleAdd(s)}
        onSubmit={() => handleAdd()}
        placeholder={placeholder}
        disabled={adding}
      />
      {value.trim() && !adding && <p className="hint-text">↵ to add · esc to cancel</p>}
    </div>
  );
}

export default function ShelfPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  useEffect(() => {
    getEntries().then(setEntries).catch(console.error).finally(() => setLoading(false));
  }, []);

  const allGenres = Array.from(new Set(entries.flatMap((e) => e.genres))).sort();

  const matchesFilter = (e: BookEntry) => {
    const matchesSearch = !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = !activeGenre || e.genres.includes(activeGenre);
    return matchesSearch && matchesGenre;
  };

  const currentlyReading = entries.filter((e) => e.status === "reading" && matchesFilter(e));
  const wantToRead = entries.filter((e) => e.status === "want-to-read" && matchesFilter(e));

  const grouped = ARCHIVED_STATUSES.reduce<Record<string, BookEntry[]>>((acc, status) => {
    acc[status] = entries.filter((e) => e.status === status && matchesFilter(e));
    return acc;
  }, {});

  const addBook = async (status: "reading" | "want-to-read", catalog?: CatalogEntry, raw?: string) => {
    const title = (catalog?.title ?? raw ?? "").trim();
    if (!title) return;
    const now = new Date();
    const entry: BookEntry = {
      id: crypto.randomUUID(),
      title,
      author: catalog?.author ?? "",
      genres: catalog?.genres ?? [],
      status,
      dateStarted: status === "reading" ? now.toISOString().split("T")[0] : "",
      dateFinished: "",
      dateShelved: status === "want-to-read" ? now.toISOString().split("T")[0] : "",
      rating: 0,
      feeling: "",
      thoughts: [],
      reads: [],
      bookmarked: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const catalogEntry = catalog ?? await findOrCreateCatalogEntry(title, "");
    await createEntry(entry, catalogEntry.id);
    if (status === "reading") {
      router.push(`/book/${entry.id}`);
    } else {
      setEntries((prev) => [...prev, entry]);
    }
  };

  const allWantToRead = entries.filter((e) => e.status === "want-to-read");

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/" className="back-link">← journals</Link>
        </div>

        <div className="flex items-baseline justify-between mb-10">
          <h1 className="page-title">shelf</h1>
          <span className="text-xs text-stone-300">{entries.length} books</span>
        </div>

        {/* filter bar — always at top */}
        <div className="flex items-baseline gap-3 mb-10 pb-6 border-b border-stone-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search..."
            className="flex-1 bg-transparent border-b border-stone-200 pb-1 text-xs text-stone-700 placeholder:text-stone-300 focus:outline-none focus:border-stone-500 transition-colors"
          />
          {allGenres.length > 0 && (
            <select
              value={activeGenre ?? ""}
              onChange={(e) => setActiveGenre(e.target.value || null)}
              className="text-xs text-stone-400 bg-transparent border-none outline-none cursor-pointer hover:text-stone-700 transition-colors font-mono"
            >
              <option value="">all genres</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}
        </div>

        {/* currently reading */}
        <div className="mb-10">
          <p className="section-label mb-3">currently reading</p>
          <div className="space-y-0.5">
            {currentlyReading.map((e) => (
              <Link key={e.id} href={`/book/${e.id}`} className="row-item group font-mono">
                <span className="text-xs text-amber-700">○</span>
                <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">{e.title}</span>
                {e.author && <span className="text-xs text-stone-400 shrink-0">{e.author}</span>}
              </Link>
            ))}
          </div>
          <InlineAdd
            placeholder="what are you reading?"
            onAdd={(catalog, raw) => addBook("reading", catalog, raw)}
          />
        </div>

        {/* to read */}
        <div className="mb-12 pb-10 border-b border-stone-100">
          <p className="section-label mb-3">to read</p>
          <div className="space-y-0.5">
            {wantToRead.slice(0, 8).map((e) => (
              <Link key={e.id} href={`/book/${e.id}`} className="row-item group font-mono">
                <span className="text-xs text-amber-600">◌</span>
                <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">{e.title}</span>
                {e.author && <span className="text-xs text-stone-400 shrink-0">{e.author}</span>}
              </Link>
            ))}
            {allWantToRead.length > 8 && !activeGenre && !search && (
              <Link href="/shelf/want-to-read" className="text-xs text-stone-300 hover:text-stone-500 transition-colors py-1 block">
                +{allWantToRead.length - 8} more →
              </Link>
            )}
          </div>
          <InlineAdd
            placeholder="add to tbr..."
            onAdd={(catalog, raw) => addBook("want-to-read", catalog, raw)}
          />
        </div>

        {/* finished / dnf */}
        {loading && (
          <div className="space-y-8 animate-pulse">
            {[14, 8].map((count, i) => (
              <div key={i}>
                <div className="h-3 w-32 bg-stone-200 rounded mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: count }).map((_, j) => (
                    <div key={j} className="flex gap-3 items-baseline">
                      <div className="h-3 bg-stone-100 rounded" style={{ width: `${40 + Math.random() * 40}%` }} />
                      <div className="flex-1 border-b border-dotted border-stone-100" />
                      <div className="h-3 w-16 bg-stone-100 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-10">
            {ARCHIVED_STATUSES.map((status) => {
              const books = grouped[status];
              if (!books?.length) return null;
              const truncate = TRUNCATED_STATUSES.has(status) && !search.trim() && !activeGenre;
              const visible = truncate ? books.slice(0, TRUNCATE_LIMIT) : books;
              const hidden = truncate ? books.length - TRUNCATE_LIMIT : 0;
              return (
                <section key={status}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-xs ${STATUS_COLOR[status]}`}>{STATUS_SYMBOL[status]}</span>
                    <p className="section-label">{STATUS_LABEL[status]}</p>
                    <span className="text-xs text-stone-300 ml-1">{books.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {visible.map((e) => (
                      <Link key={e.id} href={`/book/${e.id}`} className="row-item group font-mono">
                        <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">{e.title || "untitled"}</span>
                        {e.genres.slice(0, 2).map((g) => (
                          <span key={g} className="text-xs px-1.5 py-0 rounded-full bg-stone-100 text-stone-400 shrink-0">{g}</span>
                        ))}
                        {e.author && <span className="text-xs text-stone-400 shrink-0">{e.author}</span>}
                        <span className="dot-leader" />
                        {e.rating > 0 && <StarDisplay rating={e.rating} size={11} />}
                        {e.bookmarked && <span className="text-xs text-stone-400 shrink-0">⌖</span>}
                      </Link>
                    ))}
                  </div>
                  {hidden > 0 && (
                    <Link href={`/shelf/${status}`} className="mt-3 inline-block text-xs text-stone-400 hover:text-stone-700 transition-colors">
                      see {hidden} more →
                    </Link>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
