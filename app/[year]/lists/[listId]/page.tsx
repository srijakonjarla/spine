"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getList,
  updateList,
  deleteList,
  addListItem,
  updateListItem,
  removeListItem,
} from "../../../lib/lists";
import type { BookList, ListItem } from "../../../types";

interface NewItemDraft {
  title: string;
  author: string;
  releaseDate: string;
  notes: string;
}

const EMPTY_DRAFT: NewItemDraft = { title: "", author: "", releaseDate: "", notes: "" };

export default function ListDetailPage() {
  const { year, listId } = useParams<{ year: string; listId: string }>();
  const router = useRouter();
  const [list, setList] = useState<BookList | null>(null);
  const [draft, setDraft] = useState<NewItemDraft>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getList(listId).then((l) => {
      if (!l) { router.replace(`/${year}/lists`); return; }
      setList(l);
    });
  }, [listId, year, router]);

  const saveListField = useCallback(
    (patch: { title?: string; description?: string }) => {
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
      const item = await addListItem(listId, {
        title,
        author: draft.author.trim(),
        releaseDate: draft.releaseDate.trim(),
        notes: draft.notes.trim(),
      });
      setList((prev) => prev ? { ...prev, items: [...prev.items, item] } : prev);
      setDraft(EMPTY_DRAFT);
      setShowDraftForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateItem = (id: string, patch: Partial<ListItem>) => {
    setList((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => i.id === id ? { ...i, ...patch } : i) } : prev
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateListItem(id, patch), 600);
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

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href={`/${year}/lists`} className="back-link">
            ← lists
          </Link>
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
          className="w-full text-lg font-semibold text-stone-900 bg-transparent border-none outline-none placeholder:text-stone-300 mb-1"
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
          className="w-full text-xs text-stone-400 bg-transparent border-none outline-none placeholder:text-stone-300 mb-8"
        />

        {/* items */}
        <div className="space-y-5 mb-8">
          {list.items.length === 0 && !showDraftForm && (
            <p className="text-xs text-stone-300">no entries yet.</p>
          )}
          {list.items.map((item, i) => (
            <div key={item.id} className="group flex gap-3">
              <span className="text-xs text-stone-300 shrink-0 mt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0 border-b border-stone-100 pb-3">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                  placeholder="title"
                  className="w-full text-sm text-stone-800 bg-transparent border-none outline-none placeholder:text-stone-300 font-medium"
                />
                <div className="flex gap-3 mt-0.5">
                  <input
                    type="text"
                    value={item.author}
                    onChange={(e) => handleUpdateItem(item.id, { author: e.target.value })}
                    placeholder="author"
                    className="flex-1 text-xs text-stone-500 bg-transparent border-none outline-none placeholder:text-stone-200"
                  />
                  <input
                    type="text"
                    value={item.releaseDate}
                    onChange={(e) => handleUpdateItem(item.id, { releaseDate: e.target.value })}
                    placeholder="release date"
                    className="w-28 text-xs text-stone-500 bg-transparent border-none outline-none placeholder:text-stone-200 text-right"
                  />
                </div>
                {(item.notes !== undefined) && (
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                    placeholder="notes"
                    className="w-full text-xs text-stone-400 italic bg-transparent border-none outline-none placeholder:text-stone-200 mt-0.5"
                  />
                )}
              </div>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="text-xs text-stone-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* add entry */}
        {showDraftForm ? (
          <div className="border border-stone-200 rounded-lg p-4 mb-8 space-y-2">
            <input
              ref={titleInputRef}
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder="book title"
              autoFocus
              className="w-full text-sm text-stone-800 bg-transparent border-none outline-none placeholder:text-stone-300 font-medium"
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={draft.author}
                onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="author"
                className="flex-1 text-xs text-stone-500 bg-transparent border-none outline-none placeholder:text-stone-300"
              />
              <input
                type="text"
                value={draft.releaseDate}
                onChange={(e) => setDraft((d) => ({ ...d, releaseDate: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="release date (optional)"
                className="w-36 text-xs text-stone-500 bg-transparent border-none outline-none placeholder:text-stone-300 text-right"
              />
            </div>
            <input
              type="text"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder="notes (optional)"
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
                onClick={() => { setDraft(EMPTY_DRAFT); setShowDraftForm(false); }}
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
          <button
            onClick={handleDelete}
            className="btn-delete"
          >
            delete list
          </button>
        </div>
      </div>
    </div>
  );
}
