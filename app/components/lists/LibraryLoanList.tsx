"use client";

import { useState } from "react";
import Link from "next/link";
import { CatalogSearch } from "@/components/CatalogSearch";
import { addListItem } from "@/lib/lists";
import type { ListItem, BookEntry } from "@/types";
import type { CatalogEntry } from "@/lib/catalog";

interface Props {
  listId: string;
  items: ListItem[];
  libraryEntries: BookEntry[];
  draggingId: string | null;
  itemProps: (index: number, id: string) => React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  today: string;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateDate: (id: string, date: string) => void;
  onUpdatePrice: (id: string, price: string) => void;
  onUpdateType: (id: string, type: string) => void;
  onRemove: (id: string) => void;
  onItemAdded: (item: ListItem) => void;
}

export function LibraryLoanList({
  listId,
  items,
  libraryEntries,
  draggingId,
  itemProps,
  today,
  onUpdateNotes,
  onUpdateDate,
  onUpdatePrice,
  onUpdateType,
  onRemove,
  onItemAdded,
}: Props) {
  const [itemSearch, setItemSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftBookId, setDraftBookId] = useState("");
  const [draftCallNum, setDraftCallNum] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [draftLoanPrice, setDraftLoanPrice] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const title = draftTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const item = await addListItem(listId, {
        title,
        bookId: draftBookId || undefined,
        author: draftAuthor.trim(),
        notes: draftCallNum.trim(),
        releaseDate: draftDueDate,
        price: draftLoanPrice.trim(),
        type: "",
      });
      onItemAdded(item);
      setDraftTitle("");
      setDraftAuthor("");
      setDraftBookId("");
      setDraftCallNum("");
      setDraftDueDate("");
      setDraftLoanPrice("");
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const filtered = items.filter((item) => {
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
          type="text"
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
          placeholder="search…"
          className="underline-input mb-4"
        />
      )}
      <div className="space-y-2 mb-3">
        {filtered.map((item, index) => {
          const isOverdue =
            item.releaseDate &&
            item.releaseDate < today &&
            item.type !== "returned";
          const isReturned = item.type === "returned";
          const isRenewed = item.type === "renewed";
          return (
            <div
              key={item.id}
              className={`group bg-[var(--bg-surface)] rounded-xl px-4 py-3 border transition-all ${isOverdue ? "border-red-300/60" : isReturned ? "border-[var(--border-light)] opacity-60" : "border-[var(--border-light)]"} ${draggingId === item.id ? "opacity-40" : ""}`}
              {...(itemSearch.trim() ? {} : itemProps(index, item.id))}
            >
              {/* Top row: drag + title + status actions */}
              <div className="flex gap-3 items-start">
                {!itemSearch.trim() && (
                  <span className="cursor-grab active:cursor-grabbing text-[var(--fg-faint)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none mt-0.5">
                    ⠿
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  {item.bookId ? (
                    <Link
                      href={`/book/${item.bookId}`}
                      className={`font-serif text-[13px] font-semibold leading-snug hover:text-[var(--terra)] transition-colors ${isReturned ? "line-through text-[var(--fg-muted)]" : "text-[var(--fg-heading)]"}`}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <p
                      className={`font-serif text-[13px] font-semibold leading-snug ${isReturned ? "line-through text-[var(--fg-muted)]" : "text-[var(--fg-heading)]"}`}
                    >
                      {item.title}
                    </p>
                  )}
                  {item.author && (
                    <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                      {item.author}
                    </p>
                  )}
                </div>
                {/* Status badge + actions */}
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                      isReturned
                        ? "text-sage border-sage/40 bg-sage/10"
                        : isRenewed
                          ? "text-gold border-gold/40 bg-gold/10"
                          : isOverdue
                            ? "text-red-400 border-red-300/50 bg-red-400/8"
                            : "text-[var(--fg-faint)] border-[var(--border-light)]"
                    }`}
                  >
                    {isReturned
                      ? "returned"
                      : isRenewed
                        ? "renewed"
                        : isOverdue
                          ? "overdue"
                          : "out"}
                  </span>
                  {!isReturned && (
                    <>
                      {!isRenewed && (
                        <button
                          title="Mark renewed"
                          onClick={() => onUpdateType(item.id, "renewed")}
                          className="text-[11px] text-[var(--fg-faint)] hover:text-gold transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ↻
                        </button>
                      )}
                      <button
                        title="Mark returned"
                        onClick={() => onUpdateType(item.id, "returned")}
                        className="text-[11px] text-[var(--fg-faint)] hover:text-sage transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ✓
                      </button>
                    </>
                  )}
                  {isReturned && (
                    <button
                      title="Undo return"
                      onClick={() => onUpdateType(item.id, "")}
                      className="text-[10px] text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      undo
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-base text-[var(--fg-faint)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-1"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Bottom row: call #, due date, price */}
              <div className="flex items-center gap-4 mt-2 pl-5">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-faint)] shrink-0">
                    call #
                  </span>
                  <input
                    type="text"
                    value={item.notes ?? ""}
                    onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                    placeholder="—"
                    className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--fg-muted)] bg-transparent border-none outline-none w-28 placeholder:text-[var(--fg-faint)]/40"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${isOverdue && !isReturned ? "text-red-400" : "text-[var(--fg-faint)]"}`}
                  >
                    due
                  </span>
                  <input
                    type="date"
                    value={item.releaseDate ?? ""}
                    onChange={(e) => onUpdateDate(item.id, e.target.value)}
                    className={`text-[11px] bg-transparent border-none outline-none ${isOverdue && !isReturned ? "text-red-400" : "text-[var(--fg-muted)]"}`}
                  />
                </div>
                <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-faint)]">
                    Amount Saved $
                  </span>
                  <input
                    type="text"
                    value={item.price ?? ""}
                    onChange={(e) => onUpdatePrice(item.id, e.target.value)}
                    placeholder="0.00"
                    className="text-[11px] text-[var(--fg-muted)] bg-transparent border-none outline-none w-14 placeholder:text-[var(--fg-faint)]/40"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add loan */}
      {showAdd ? (
        <div className="rounded-xl px-4 py-3 border border-dashed border-[var(--border-light)] bg-[var(--bg-surface)] space-y-2.5">
          <CatalogSearch
            value={draftTitle}
            onChange={(v) => setDraftTitle(v)}
            onSelect={(s: CatalogEntry) => {
              setDraftTitle(s.title);
              setDraftAuthor(s.author);
              setDraftBookId(s.bookId ?? "");
            }}
            onSubmit={handleAdd}
            placeholder="search for a book…"
            libraryEntries={libraryEntries}
          />
          <input
            type="text"
            value={draftAuthor}
            onChange={(e) => setDraftAuthor(e.target.value)}
            placeholder="author"
            className="text-xs text-[var(--fg-muted)] bg-transparent border-none outline-none w-full placeholder:text-[var(--fg-faint)]"
          />
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-faint)]">
                Call #
              </span>
              <input
                type="text"
                value={draftCallNum}
                onChange={(e) => setDraftCallNum(e.target.value)}
                placeholder="e.g. FIC ROW"
                className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--fg-muted)] bg-transparent border-b border-[var(--border-light)] outline-none w-24 pb-0.5 placeholder:text-[var(--fg-faint)]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-faint)]">
                Due
              </span>
              <input
                type="date"
                value={draftDueDate}
                onChange={(e) => setDraftDueDate(e.target.value)}
                className="text-xs text-[var(--fg-muted)] bg-transparent border-none outline-none"
              />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-faint)]">
                Amount Saved $
              </span>
              <input
                type="text"
                value={draftLoanPrice}
                onChange={(e) => setDraftLoanPrice(e.target.value)}
                placeholder="0.00"
                className="text-xs text-[var(--fg-muted)] bg-transparent border-b border-[var(--border-light)] outline-none w-16 pb-0.5 placeholder:text-[var(--fg-faint)]"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1.5 border-t border-[var(--border-light)]">
            <button
              onClick={handleAdd}
              disabled={!draftTitle.trim() || adding}
              className="text-xs font-semibold text-[var(--plum)] hover:text-[var(--plum-light)] transition-colors disabled:opacity-30"
            >
              add ↵
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setDraftTitle("");
                setDraftAuthor("");
                setDraftBookId("");
                setDraftCallNum("");
                setDraftDueDate("");
                setDraftLoanPrice("");
              }}
              className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors"
            >
              cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex gap-2.5 items-center px-4 py-3 rounded-xl border border-dashed border-[var(--border-light)] hover:border-[var(--terra)] hover:bg-[var(--terra)]/4 transition-all font-[family-name:var(--font-caveat)] text-[13px] text-[var(--fg-muted)] hover:text-[var(--terra)]"
        >
          <span className="text-lg">＋</span>
          check out a book…
        </button>
      )}
    </>
  );
}
