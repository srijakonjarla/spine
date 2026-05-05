"use client";

import { useState } from "react";
import Link from "next/link";
import { CatalogSearch } from "@/components/CatalogSearch";
import { addListItem } from "@/lib/lists";
import { BookCover } from "@/components/BookCover";
import { STATUS_SYMBOL, STATUS_COLOR, STATUS_LABEL } from "@/lib/statusMeta";
import type { ListItem, BookEntry } from "@/types";
import type { CatalogEntry } from "@/lib/catalog";

import { spineColor } from "@/lib/spineUtils";
import { toast } from "@/lib/toast";

interface Props {
  listId: string;
  listType: string;
  items: ListItem[];
  libraryEntries: BookEntry[];
  draggingId: string | null;
  itemProps: (
    index: number,
    id: string,
  ) => React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  onUpdateNotes: (id: string, notes: string) => void;
  onRemove: (id: string) => void;
  onItemAdded: (item: ListItem) => void;
}

function SpinePlaceholder({ title }: { title: string }) {
  return (
    <svg
      viewBox="0 0 38 54"
      className="rounded-sm w-9.5 h-13.5 shadow-[var(--shadow-spine-card)]"
    >
      <rect width="38" height="54" rx="3" fill={spineColor(title)} />
      <rect
        x="4"
        y="8"
        width="30"
        height="1.5"
        rx="0.75"
        fill="var(--spine-gloss-line)"
      />
    </svg>
  );
}

export function BookListItems({
  listId,
  listType,
  items,
  libraryEntries,
  draggingId,
  itemProps,
  onUpdateNotes,
  onRemove,
  onItemAdded,
}: Props) {
  const [itemSearch, setItemSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftBookId, setDraftBookId] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const title = draftTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      let bookId = draftBookId;
      if (!bookId && listType === "book_list") {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            author: draftAuthor.trim(),
            status: "want-to-read",
          }),
        });
        if (res.ok) {
          const book = await res.json();
          bookId = book.id ?? "";
        }
      }
      const item = await addListItem(listId, {
        title,
        bookId,
        author: draftAuthor.trim(),
      });
      onItemAdded(item);
      setDraftTitle("");
      setDraftAuthor("");
      setDraftBookId("");
      setShowAdd(false);
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const filtered = items.filter((item: ListItem) => {
    if (!itemSearch.trim()) return true;
    const q = itemSearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.author ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      {items.length > 4 && (
        <input
          id="book-list-items-search"
          type="text"
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
          placeholder="search by title or author…"
          className="underline-input mb-4"
        />
      )}
      <div className="space-y-2.5 mb-3">
        {filtered.map((item: ListItem, index: number) => {
          const matched = libraryEntries.find(
            (b) =>
              b.title.toLowerCase() === item.title.toLowerCase() &&
              (!item.author ||
                b.author.toLowerCase() === item.author.toLowerCase()),
          );
          const status = matched?.status;
          return (
            <div
              key={item.id}
              className={`group flex gap-3.5 items-center bg-surface rounded-xl px-4 py-3 border border-line transition-all ${draggingId === item.id ? "opacity-40" : "hover:translate-x-1"}`}
              {...(itemSearch.trim() ? {} : itemProps(index, item.id))}
            >
              {!itemSearch.trim() && (
                <span className="cursor-grab active:cursor-grabbing text-fg-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none text-base">
                  ⠿
                </span>
              )}

              {/* Cover */}
              {item.bookId ? (
                <Link href={`/book/${item.bookId}`} className="shrink-0">
                  {item.coverUrl ? (
                    <BookCover
                      coverUrl={item.coverUrl}
                      title={item.title}
                      className="rounded-sm w-9.5 h-13.5"
                    />
                  ) : (
                    <SpinePlaceholder title={item.title} />
                  )}
                </Link>
              ) : item.coverUrl ? (
                <BookCover
                  coverUrl={item.coverUrl}
                  title={item.title}
                  className="shrink-0 rounded-sm w-9.5 h-13.5"
                />
              ) : (
                <span className="shrink-0">
                  <SpinePlaceholder title={item.title} />
                </span>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                {item.bookId ? (
                  <Link
                    href={`/book/${item.bookId}`}
                    className="font-serif text-note font-semibold text-fg-heading leading-snug hover:text-terra transition-colors"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-serif text-note font-semibold text-fg-heading leading-snug">
                    {item.title}
                  </p>
                )}
                {item.author && (
                  <p className="text-caption text-fg-muted mt-0.5">
                    {item.author}
                  </p>
                )}
                <input
                  id={`book-list-item-${item.id}-note`}
                  type="text"
                  value={item.notes ?? ""}
                  onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                  placeholder="add a note…"
                  className="font-hand text-xs text-terra bg-transparent border-none outline-none w-full mt-1 placeholder:text-terra/40"
                />
              </div>

              {/* Status pill */}
              {status && (
                <span
                  className={`shrink-0 text-detail font-medium px-2 py-0.5 rounded-full border opacity-70 group-hover:opacity-100 transition-opacity ${STATUS_COLOR[status]} border-current`}
                >
                  {STATUS_SYMBOL[status]}{" "}
                  {STATUS_LABEL[status] === "want to read"
                    ? "tbr"
                    : STATUS_LABEL[status]}
                </span>
              )}

              <button
                onClick={() => onRemove(item.id)}
                className="text-lg text-fg-faint hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Add book row */}
      {showAdd ? (
        <div className="rounded-xl px-4 py-3 border border-dashed border-line bg-surface">
          <CatalogSearch
            id="book-list-add-title"
            value={draftTitle}
            onChange={(v) => setDraftTitle(v)}
            onSelect={(s: CatalogEntry) => {
              setDraftTitle(s.title);
              setDraftAuthor(s.author);
              setDraftBookId(s.bookId ?? "");
            }}
            onSubmit={handleAdd}
            placeholder="search for a book to add…"
            className="mb-1"
            libraryEntries={libraryEntries}
          />
          <input
            id="book-list-add-author"
            type="text"
            value={draftAuthor}
            onChange={(e) => setDraftAuthor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="author"
            className="text-xs text-fg-muted bg-transparent border-none outline-none w-full placeholder:text-fg-faint"
          />
          <div className="flex gap-3 mt-2 pt-2 border-t border-line">
            <button
              onClick={handleAdd}
              disabled={!draftTitle.trim() || adding}
              className="text-xs font-semibold text-fg-heading hover:fg transition-colors disabled:opacity-30"
            >
              add ↵
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setDraftTitle("");
                setDraftAuthor("");
                setDraftBookId("");
              }}
              className="text-xs text-fg-faint hover:text-fg-muted transition-colors"
            >
              cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex gap-2.5 items-center px-4 py-3 rounded-xl border border-dashed border-line hover:border-terra hover:bg-terra/4 transition-all font-hand text-note text-fg-muted hover:text-terra"
        >
          <span className="text-lg">＋</span>
          search for a book to add…
        </button>
      )}
    </>
  );
}
