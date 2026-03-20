"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getList, updateList, deleteList,
  addListItem, updateListItem, removeListItem,
  reorderListItems, toggleListBookmark,
} from "@/lib/lists";
import { BookmarkButton } from "@/components/BookmarkButton";
import { CatalogSearch } from "@/components/CatalogSearch";
import { useDraggableList } from "@/hooks/useDraggableList";
import { findOrCreateCatalogEntry, type CatalogEntry } from "@/lib/catalog";
import type { BookList, ListItem } from "@/types";

interface NewItemDraft {
  title: string;
  author: string;
  releaseDate: string;
  notes: string;
}

const emptyDraft = (): NewItemDraft => ({ title: "", author: "", releaseDate: "", notes: "" });

export default function ListDetailPage() {
  const { year, listId } = useParams<{ year: string; listId: string }>();
  const router = useRouter();
  const [list, setList] = useState<BookList | null>(null);
  const [draft, setDraft] = useState<NewItemDraft>(emptyDraft);
  const [adding, setAdding] = useState(false);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const setItems = useCallback(
    (updater: React.SetStateAction<ListItem[]>) =>
      setList((prev) => {
        if (!prev) return prev;
        const next = typeof updater === "function" ? updater(prev.items) : updater;
        return { ...prev, items: next };
      }),
    []
  );
  const { dragProps } = useDraggableList(setItems, reorderListItems);

  useEffect(() => {
    getList(listId).then((l) => {
      if (!l) { router.replace(`/${year}/lists`); return; }
      setList(l);
    });
  }, [listId, year, router]);

  const saveListField = useCallback(
    (patch: Parameters<typeof updateList>[1]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateList(listId, patch), 600);
    },
    [listId]
  );

  const handleAddItem = async () => {
    const title = draft.title.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const catalog = await findOrCreateCatalogEntry(title, draft.author.trim(), draft.releaseDate.trim() || undefined);
      const item = await addListItem(listId, {
        catalogId: catalog.id,
        releaseDate: draft.releaseDate.trim(),
        notes: draft.notes.trim(),
      });
      setList((prev) => prev ? { ...prev, items: [...prev.items, item] } : prev);
      setDraft(emptyDraft());
      setShowDraftForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateItem = (id: string, patch: { releaseDate?: string; notes?: string }) => {
    setList((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => i.id === id ? { ...i, ...patch } : i) } : prev
    );
    const existing = itemSaveTimers.current.get(id);
    if (existing) clearTimeout(existing);
    itemSaveTimers.current.set(id, setTimeout(() => {
      updateListItem(id, patch);
      itemSaveTimers.current.delete(id);
    }, 600));
  };

  const handleRemoveItem = async (id: string) => {
    setList((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev);
    await removeListItem(id, listId);
  };

  const handleDelete = async () => {
    await deleteList(listId);
    router.push(`/${year}/lists`);
  };

  if (!list) return <div className="page" />;

  const showDate = !!list.dateLabel;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8 flex items-center justify-between">
          <Link href={`/${year}/lists`} className="back-link">← lists</Link>
          <BookmarkButton
            bookmarked={list.bookmarked}
            onToggle={async () => {
              const next = !list.bookmarked;
              setList((prev) => prev ? { ...prev, bookmarked: next } : prev);
              await toggleListBookmark(listId, next);
            }}
            size="sm"
          />
        </div>

        {/* title */}
        <input
          type="text"
          value={list.title}
          onChange={(e) => {
            const title = e.target.value;
            setList((prev) => prev ? { ...prev, title } : prev);
            saveListField({ title });
          }}
          placeholder="list title"
          className="w-full text-lg font-semibold text-stone-900 bg-transparent border-none outline-none placeholder:text-stone-300 mb-1 lowercase"
        />

        {/* description */}
        <input
          type="text"
          value={list.description}
          onChange={(e) => {
            const description = e.target.value;
            setList((prev) => prev ? { ...prev, description } : prev);
            saveListField({ description });
          }}
          placeholder="description (optional)"
          className="w-full text-xs text-stone-400 bg-transparent border-none outline-none placeholder:text-stone-300 mb-6"
        />

        {/* items */}
        <div className="space-y-5 mb-8">
          {list.items.length === 0 && !showDraftForm && (
            <p className="text-xs text-stone-300">no entries yet.</p>
          )}
          {list.items.map((item: ListItem, i: number) => (
            <div key={item.id} {...dragProps(item.id)} className="group flex gap-3 cursor-default">
              <span className="text-xs text-stone-200 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 cursor-grab active:cursor-grabbing select-none">⠿</span>
              <span className="text-xs text-stone-300 shrink-0 mt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0 border-b border-stone-100 pb-3">
                <p className="text-sm text-stone-800 font-medium lowercase">{item.title}</p>
                <div className="flex gap-3 mt-0.5 items-baseline">
                  {item.author && <p className="flex-1 text-xs text-stone-500 lowercase truncate">{item.author}</p>}
                  {showDate && (
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-xs text-stone-300">{list.dateLabel}:</span>
                      <input
                        type="date"
                        value={item.releaseDate}
                        onChange={(e) => handleUpdateItem(item.id, { releaseDate: e.target.value })}
                        className="text-xs text-stone-500 bg-transparent border-none outline-none"
                      />
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={item.notes}
                  onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                  placeholder={list.notesLabel}
                  className="w-full text-xs text-stone-400 italic bg-transparent border-none outline-none placeholder:text-stone-200 mt-0.5"
                />
              </div>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="text-xs text-stone-200 hover:text-red-400 transition-colors shrink-0 mt-0.5 opacity-0 group-hover:opacity-100"
                title="remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* add entry */}
        {showDraftForm ? (
          <div className="border border-stone-200 rounded-lg p-4 mb-8 space-y-2">
            <CatalogSearch
              value={draft.title}
              onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
              onSelect={(s: CatalogEntry) => setDraft((d) => ({
                ...d,
                title: s.title,
                author: s.author,
                releaseDate: s.releaseDate || d.releaseDate,
              }))}
              onSubmit={handleAddItem}
              placeholder="book title"
              showReleaseDate
              className="mb-0"
            />
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                value={draft.author}
                onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="author"
                className="flex-1 min-w-0 text-xs text-stone-500 bg-transparent border-none outline-none placeholder:text-stone-300 lowercase"
              />
              {showDate && (
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="text-xs text-stone-300">{list.dateLabel}:</span>
                  <input
                    type="date"
                    value={draft.releaseDate}
                    onChange={(e) => setDraft((d) => ({ ...d, releaseDate: e.target.value }))}
                    className="text-xs text-stone-500 bg-transparent border-none outline-none"
                  />
                </div>
              )}
            </div>
            <input
              type="text"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder={list.notesLabel}
              className="w-full text-xs text-stone-400 italic bg-transparent border-none outline-none placeholder:text-stone-300"
            />
            <div className="flex gap-3 pt-1 border-t border-stone-100 mt-2">
              <button
                onClick={handleAddItem}
                disabled={!draft.title.trim() || adding}
                className="text-xs text-stone-700 hover:text-stone-900 transition-colors disabled:opacity-30"
              >
                add entry ↵
              </button>
              <button
                onClick={() => { setDraft(emptyDraft()); setShowDraftForm(false); }}
                className="text-xs text-stone-300 hover:text-stone-500 transition-colors"
              >
                cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setShowDraftForm(true); setTimeout(() => titleInputRef.current?.focus(), 0); }}
            className="back-link mb-8"
          >
            + add entry
          </button>
        )}

        {/* footer */}
        <div className="border-t border-stone-100 pt-4 flex justify-between items-center">
          <p className="text-xs text-stone-300">{list.items.length} {list.items.length === 1 ? "entry" : "entries"}</p>
          <button onClick={handleDelete} className="btn-delete">delete list</button>
        </div>
      </div>
    </div>
  );
}
