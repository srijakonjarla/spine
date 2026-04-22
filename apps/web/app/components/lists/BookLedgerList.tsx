"use client";

import { useState } from "react";
import Link from "next/link";
import { CatalogSearch } from "@/components/CatalogSearch";
import { addListItem } from "@/lib/lists";
import type { ListItem, BookEntry } from "@/types";
import type { CatalogEntry } from "@/lib/catalog";
import { toast } from "@/lib/toast";

export const TX_TYPES = ["bought", "sold", "gifted", "donated"] as const;
export type TxType = (typeof TX_TYPES)[number];
export const TX_COLORS: Record<TxType, string> = {
  bought: "text-fg-heading bg-plum/10 border-plum/30",
  sold: "text-sage bg-sage/10 border-sage/30",
  gifted: "text-gold bg-gold/10 border-gold/30",
  donated: "text-fg-muted bg-hover border-line",
};

interface Props {
  listId: string;
  items: ListItem[];
  libraryEntries: BookEntry[];
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateDate: (id: string, date: string) => void;
  onUpdatePrice: (id: string, price: string) => void;
  onUpdateType: (id: string, type: string) => void;
  onRemove: (id: string) => void;
  onItemAdded: (item: ListItem) => void;
}

export function BookLedgerList({
  listId,
  items,
  libraryEntries,
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
  const [draftTxType, setDraftTxType] = useState<TxType>("bought");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftSource, setDraftSource] = useState("");
  const [draftTxDate, setDraftTxDate] = useState("");
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
        type: draftTxType,
        price: draftPrice.trim(),
        notes: draftSource.trim(),
        releaseDate: draftTxDate,
      });
      onItemAdded(item);
      setDraftTitle("");
      setDraftAuthor("");
      setDraftBookId("");
      setDraftTxType("bought");
      setDraftPrice("");
      setDraftSource("");
      setDraftTxDate("");
      setShowAdd(false);
    } catch {
      toast("Something went wrong. Please try again.");
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
      <div className="mb-3">
        {items.length > 0 && (
          <div className="flex gap-3 items-center px-1 pb-1.5 mb-1 border-b border-line text-detail uppercase tracking-widest font-semibold text-fg-faint">
            <span className="flex-1">book</span>
            <span className="w-20 shrink-0">type</span>
            <span className="w-16 shrink-0">price</span>
            <span className="w-28 shrink-0 hidden sm:block">from / to</span>
            <span className="w-24 shrink-0 hidden md:block">date</span>
            <span className="w-4 shrink-0" />
          </div>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="group flex gap-3 items-center py-2.5 border-b border-line last:border-none hover:bg-plum-trace -mx-1 px-1 rounded-lg transition-colors"
          >
            {/* Title + author */}
            <div className="flex-1 min-w-0">
              {item.bookId ? (
                <Link
                  href={`/book/${item.bookId}`}
                  className="text-note font-semibold text-fg-heading hover:text-terra transition-colors leading-snug truncate block"
                >
                  {item.title}
                </Link>
              ) : (
                <p className="text-note font-semibold text-fg-heading leading-snug truncate">
                  {item.title}
                </p>
              )}
              {item.author && (
                <p className="text-caption text-fg-muted truncate">
                  {item.author}
                </p>
              )}
            </div>
            {/* Transaction type */}
            <div className="w-20 shrink-0">
              <select
                value={item.type || "bought"}
                onChange={(e) => onUpdateType(item.id, e.target.value)}
                className={`text-detail font-semibold px-2 py-0.5 rounded-full border cursor-pointer bg-transparent outline-none ${TX_COLORS[(item.type as TxType) || "bought"]}`}
              >
                {TX_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {/* Price */}
            <div className="w-16 shrink-0 flex items-center gap-0.5">
              <span className="text-caption text-fg-faint">$</span>
              <input
                type="text"
                value={item.price ?? ""}
                onChange={(e) => onUpdatePrice(item.id, e.target.value)}
                placeholder="0.00"
                className="text-xs text-fg-muted bg-transparent border-none outline-none w-full placeholder:text-fg-faint/50"
              />
            </div>
            {/* Source / destination */}
            <input
              type="text"
              value={item.notes ?? ""}
              onChange={(e) => onUpdateNotes(item.id, e.target.value)}
              placeholder="from / to…"
              className="w-28 shrink-0 hidden sm:block text-xs text-fg-muted bg-transparent border-none outline-none placeholder:text-fg-faint/50"
            />
            {/* Date */}
            <input
              type="date"
              value={item.releaseDate ?? ""}
              onChange={(e) => onUpdateDate(item.id, e.target.value)}
              className="w-24 shrink-0 hidden md:block text-xs text-fg-faint bg-transparent border-none outline-none"
            />
            <button
              onClick={() => onRemove(item.id)}
              className="w-4 shrink-0 text-lg text-fg-faint hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add entry */}
      {showAdd ? (
        <div className="rounded-xl px-4 py-3 border border-dashed border-line bg-surface space-y-2">
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
            className="text-xs text-fg-muted bg-transparent border-none outline-none w-full placeholder:text-fg-faint"
          />
          <div className="flex gap-1.5 flex-wrap">
            {TX_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDraftTxType(t)}
                className={`text-detail font-semibold px-2.5 py-1 rounded-full border transition-colors ${draftTxType === t ? TX_COLORS[t] : "border-line text-fg-faint"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-0.5">
              <span className="text-caption text-fg-faint">$</span>
              <input
                type="text"
                value={draftPrice}
                onChange={(e) => setDraftPrice(e.target.value)}
                placeholder="0.00"
                className="text-xs text-fg-muted bg-transparent border-b border-line outline-none w-16 pb-0.5 placeholder:text-fg-faint"
              />
            </div>
            <input
              type="text"
              value={draftSource}
              onChange={(e) => setDraftSource(e.target.value)}
              placeholder="from / to…"
              className="flex-1 text-xs text-fg-muted bg-transparent border-b border-line outline-none pb-0.5 placeholder:text-fg-faint"
            />
            <input
              type="date"
              value={draftTxDate}
              onChange={(e) => setDraftTxDate(e.target.value)}
              className="text-xs text-fg-faint bg-transparent border-none outline-none"
            />
          </div>
          <div className="flex gap-3 pt-2 border-t border-line">
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
                setDraftTxType("bought");
                setDraftPrice("");
                setDraftSource("");
                setDraftTxDate("");
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
          log a transaction…
        </button>
      )}
    </>
  );
}
