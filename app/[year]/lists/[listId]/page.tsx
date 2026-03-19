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
  toggleListBookmark,
} from "../../../lib/lists";
import { BookmarkButton } from "../../../components/BookmarkButton";
import { searchCatalog, findOrCreateCatalogEntry, type CatalogEntry } from "../../../lib/catalog";
import type { BookList, ListItem } from "../../../types";

interface NewItemDraft {
  title: string;
  author: string;
  releaseDate: string;
  notes: string;
}

const emptyDraft = (year: string): NewItemDraft => ({ title: "", author: "", releaseDate: `${year}-01-01`, notes: "" });

export default function ListDetailPage() {
  const { year, listId } = useParams<{ year: string; listId: string }>();
  const router = useRouter();
  const [list, setList] = useState<BookList | null>(null);
  const [draft, setDraft] = useState<NewItemDraft>(() => emptyDraft(year));
  const [adding, setAdding] = useState(false);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleTitleChange = (value: string) => {
    setDraft((d) => ({ ...d, title: value }));
    setSuggestionIdx(-1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try { setSuggestions(await searchCatalog(value)); } catch { /* ignore */ }
    }, 250);
  };

  const handleSelectSuggestion = (s: CatalogEntry) => {
    setDraft((d) => ({
      ...d,
      title: s.title,
      author: s.author,
      releaseDate: s.releaseDate || d.releaseDate,
    }));
    setSuggestions([]);
    setSuggestionIdx(-1);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSuggestionIdx((i) => Math.max(i - 1, -1)); return; }
      if (e.key === "Escape") { setSuggestions([]); setSuggestionIdx(-1); return; }
      if (e.key === "Enter" && suggestionIdx >= 0) { e.preventDefault(); handleSelectSuggestion(suggestions[suggestionIdx]); return; }
    }
    if (e.key === "Enter") { e.preventDefault(); handleAddItem(); }
  };

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
      setDraft(emptyDraft(year));
      setSuggestions([]);
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

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8 flex items-center justify-between">
          <Link href={`/${year}/lists`} className="back-link">
            ← lists
          </Link>
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
          id="list-title"
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
          id="list-description"
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
                <p className="text-sm text-stone-800 font-medium lowercase">{item.title}</p>
                <div className="flex gap-3 mt-0.5">
                  {item.author && (
                    <p className="flex-1 text-xs text-stone-500 lowercase truncate">{item.author}</p>
                  )}
                  <input
                    id={`item-release-date-${item.id}`}
                    type="date"
                    value={item.releaseDate}
                    onChange={(e) => handleUpdateItem(item.id, { releaseDate: e.target.value })}
                    className="text-xs text-stone-500 bg-transparent border-none outline-none lowercase"
                  />
                </div>
                <input
                  id={`item-notes-${item.id}`}
                  type="text"
                  value={item.notes}
                  onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                  placeholder="notes"
                  className="w-full text-xs text-stone-400 italic bg-transparent border-none outline-none placeholder:text-stone-200 mt-0.5"
                />
              </div>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="text-xs text-red-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                title="delete entry"
              >
                delete
              </button>
            </div>
          ))}
        </div>

        {/* add entry */}
        {showDraftForm ? (
          <div className="border border-stone-200 rounded-lg p-4 mb-8 space-y-2">
            <div className="relative">
              <input
                id="draft-title"
                ref={titleInputRef}
                type="text"
                value={draft.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                placeholder="book title"
                autoFocus
                className="w-full text-sm text-stone-800 bg-transparent border-none outline-none placeholder:text-stone-300 font-medium lowercase"
              />
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden z-10">
                  {suggestions.map((s, i) => (
                    <button
                      key={s.id}
                      onMouseDown={() => handleSelectSuggestion(s)}
                      className={`w-full text-left px-3 py-2 flex items-baseline gap-3 transition-colors ${i === suggestionIdx ? "bg-stone-50" : "hover:bg-stone-50"}`}
                    >
                      <span className="text-sm text-stone-800 truncate">{s.title}</span>
                      {s.author && <span className="text-xs text-stone-400 shrink-0">{s.author}</span>}
                      {s.releaseDate && <span className="text-xs text-stone-300 shrink-0 ml-auto">{s.releaseDate}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <input
                id="draft-author"
                type="text"
                value={draft.author}
                onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="author"
                className="flex-1 text-xs text-stone-500 bg-transparent border-none outline-none placeholder:text-stone-300 lowercase"
              />
              <input
                id="draft-release-date"
                type="date"
                value={draft.releaseDate}
                onChange={(e) => setDraft((d) => ({ ...d, releaseDate: e.target.value }))}
                className="text-xs text-stone-500 bg-transparent border-none outline-none lowercase"
              />
            </div>
            <input
              id="draft-notes"
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
                onClick={() => { setDraft(emptyDraft(year)); setSuggestions([]); setShowDraftForm(false); }}
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
