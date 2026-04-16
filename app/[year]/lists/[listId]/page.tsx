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
  reorderListItems,
} from "@/lib/lists";
import { useDragReorder } from "@/hooks/useDragReorder";
import { getEntries } from "@/lib/db";
import { CatalogSearch } from "@/components/CatalogSearch";
import { CoverChangeModal } from "@/components/lists/CoverChangeModal";
import { type CatalogEntry } from "@/lib/catalog";
import { STATUS_SYMBOL, STATUS_COLOR, STATUS_LABEL } from "@/lib/statusMeta";
import type { BookList, BookEntry, ListItem } from "@/types";
import {
  BooksIcon,
  LightbulbIcon,
  CheckSquareIcon,
  ListBulletsIcon,
  PaletteIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { BookmarkButton } from "@/components/BookmarkButton";
import type { Icon } from "@phosphor-icons/react";
import { coverGradientStyle } from "@/components/lists/coverConstants";
import { BookCover } from "@/components/BookCover";

const BULLET_SYMBOLS = ["→", "●", "✦", "◆", "○", "—", "✓", "★"];
const SPINE_COUNT = 10;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function spineColor(title: string): string {
  return `var(--spine-${(hashStr(title) % SPINE_COUNT) + 1})`;
}

const LIST_TYPE_LABELS: Record<string, string> = {
  book_list: "book list",
  idea_list: "idea list",
  checklist: "checklist",
  bullet_list: "bullet points",
};
const LIST_TYPE_ICONS: Record<string, Icon> = {
  book_list: BooksIcon,
  idea_list: LightbulbIcon,
  checklist: CheckSquareIcon,
  bullet_list: ListBulletsIcon,
};

export default function ListDetailPage() {
  const { year, listId } = useParams<{ year: string; listId: string }>();
  const router = useRouter();

  const [list, setList] = useState<BookList | null>(null);
  const [libraryEntries, setLibraryEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBook, setShowAddBook] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftBookId, setDraftBookId] = useState("");
  const [inlineText, setInlineText] = useState("");
  const [adding, setAdding] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const inlineRef = useRef<HTMLInputElement>(null);

  const { draggingId, itemProps } = useDragReorder(
    list?.items ?? [],
    (reordered) => {
      setList((prev) => (prev ? { ...prev, items: reordered } : prev));
      reorderListItems(
        listId,
        reordered.map((i) => i.id),
      );
    },
  );

  useEffect(() => {
    Promise.all([getList(listId), getEntries()])
      .then(([l, entries]) => {
        if (!l) {
          router.replace(`/${year}/lists`);
          return;
        }
        setList(l);
        setLibraryEntries(entries);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [listId, year, router]);

  const saveListField = useCallback(
    (patch: Parameters<typeof updateList>[1]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateList(listId, patch), 600);
    },
    [listId],
  );

  const handleAddBook = async () => {
    const title = draftTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const item = await addListItem(listId, {
        title,
        bookId: draftBookId,
        author: draftAuthor.trim(),
      });
      setList((prev) =>
        prev ? { ...prev, items: [...prev.items, item] } : prev,
      );
      setDraftTitle("");
      setDraftAuthor("");
      setShowAddBook(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleAddIdea = async () => {
    const title = inlineText.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const item = await addListItem(listId, { title });
      setList((prev) =>
        prev ? { ...prev, items: [...prev.items, item] } : prev,
      );
      setInlineText("");
      setTimeout(() => inlineRef.current?.focus(), 50);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleCheck = (id: string, currentType: string) => {
    const next = currentType === "done" ? "" : "done";
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === id ? { ...i, type: next } : i,
            ),
          }
        : prev,
    );
    updateListItem(id, { type: next });
  };

  const handleUpdateItemNotes = (id: string, notes: string) => {
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (i.id === id ? { ...i, notes } : i)),
          }
        : prev,
    );
    const t = itemSaveTimers.current.get(id);
    if (t) clearTimeout(t);
    itemSaveTimers.current.set(
      id,
      setTimeout(() => {
        updateListItem(id, { notes });
        itemSaveTimers.current.delete(id);
      }, 600),
    );
  };

  const handleRemoveItem = async (id: string) => {
    setList((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev,
    );
    await removeListItem(id, listId);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this list? This can't be undone.")) return;
    await deleteList(listId);
    router.push(`/${year}/lists`);
  };

  const handleSaveCover = async (color: string, emoji: string) => {
    setList((prev) => (prev ? { ...prev, color, emoji } : prev));
    await updateList(listId, { color, emoji });
    setShowCoverModal(false);
  };

  if (!list) return <div className="page" />;

  const isIdeaType = ["idea_list", "bullet_list", "checklist"].includes(
    list.listType,
  );
  const isChecklist = list.listType === "checklist";
  const bullet = list.bulletSymbol || "→";
  const itemLabel = isIdeaType ? "ideas" : "books";

  if (loading)
    return (
      <div className="page animate-pulse">
        <div className="h-48 bg-[var(--bg-hover)] mb-8" />
        <div className="page-content space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-[var(--bg-hover)] rounded-lg" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="page">
      {/* Back link */}
      <div className="px-8 pt-5 flex items-center justify-between">
        <Link
          href={`/${year}/lists`}
          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-heading)] transition-colors"
        >
          ← lists
        </Link>
        <BookmarkButton
          bookmarked={list.bookmarked}
          onToggle={() => {
            const bookmarked = !list.bookmarked;
            setList((prev) => (prev ? { ...prev, bookmarked } : prev));
            saveListField({ bookmarked });
          }}
        />
      </div>

      {/* Gradient header */}
      <div
        className="relative overflow-hidden px-15 py-8 mt-3"
        style={coverGradientStyle(list.color)}
      >
        {/* Glow orb */}
        {/* This doesn't show up */}
        <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full pointer-events-none [background-image:var(--cover-glow-orb)]" />
        {(() => {
          const TypeIcon = LIST_TYPE_ICONS[list.listType] ?? BooksIcon;
          return (
            <p className="flex items-center gap-1.5 font-[family-name:var(--font-caveat)] text-sm mb-1 relative z-10 text-white/55">
              <TypeIcon size={14} />
              {LIST_TYPE_LABELS[list.listType] ?? "list"}
            </p>
          );
        })()}
        <input
          type="text"
          value={list.title}
          onChange={(e) => {
            const title = e.target.value;
            setList((prev) => (prev ? { ...prev, title } : prev));
            saveListField({ title });
          }}
          placeholder="list title"
          className="w-full font-serif text-3xl font-bold italic text-white bg-transparent border-none outline-none mb-1 relative z-10 placeholder:text-white/40 leading-snug"
        />
        <p className="font-[family-name:var(--font-caveat)] text-sm relative z-10 text-white/60">
          {list.items.length} {itemLabel}
          {list.description ? ` · ${list.description}` : ""}
        </p>
      </div>

      {/* 2-column body */}
      <div className="grid grid-cols-[1fr_280px]">
        {/* ── Left: items ── */}
        <div className="px-7 py-6">
          {isIdeaType ? (
            /* Idea / bullet / checklist */
            <>
              {/* Bullet symbol picker (not for checklist) */}
              {!isChecklist && (
                <div className="flex items-center gap-3 mb-5 font-[family-name:var(--font-caveat)] text-[13px] text-[var(--fg-muted)]">
                  symbol
                  <div className="flex gap-1.5">
                    {BULLET_SYMBOLS.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => {
                          setList((prev) =>
                            prev ? { ...prev, bulletSymbol: sym } : prev,
                          );
                          saveListField({ bulletSymbol: sym });
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all font-[family-name:var(--font-caveat)] ${
                          bullet === sym
                            ? "text-white bg-[var(--terra)]"
                            : "text-[var(--terra)] bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-[var(--terra)]"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dotted grid */}
              <div className="rounded-xl px-7 py-6 min-h-[280px] bg-[var(--bg-surface)] border border-[var(--border-light)] bg-[size:18px_18px] bg-[radial-gradient(circle,_var(--bg-muted-tag)_1px,_transparent_1px)]">
                {list.items.map((item: ListItem, index: number) => (
                  <div
                    key={item.id}
                    className={`group flex gap-3 items-start py-1.5 border-b border-[var(--border-light)] last:border-none transition-opacity ${draggingId === item.id ? "opacity-40" : ""}`}
                    {...itemProps(index, item.id)}
                  >
                    <span className="cursor-grab active:cursor-grabbing text-[var(--fg-faint)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none mt-0.5">
                      ⠿
                    </span>
                    {isChecklist ? (
                      <button
                        onClick={() => handleToggleCheck(item.id, item.type)}
                        className={`shrink-0 mt-1 w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-colors ${
                          item.type === "done"
                            ? "bg-[var(--terra)] border-[var(--terra)]"
                            : "border-[var(--terra)] bg-transparent"
                        }`}
                      >
                        {item.type === "done" && (
                          <span className="text-white text-[9px] leading-none">
                            ✓
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[15px] w-5 mt-0.5 text-[var(--terra)]">
                        {bullet}
                      </span>
                    )}
                    <span
                      className={`font-[family-name:var(--font-caveat)] text-base flex-1 leading-snug text-[var(--terra)] ${
                        isChecklist && item.type === "done"
                          ? "line-through opacity-45"
                          : ""
                      }`}
                    >
                      {item.title}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-base text-[var(--fg-faint)] hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Inline add row */}
                <div className="flex gap-3 items-start py-1.5 opacity-40 focus-within:opacity-100 transition-opacity">
                  {isChecklist ? (
                    <span className="shrink-0 mt-1 w-4 h-4 rounded border-[1.5px] border-[var(--terra)]" />
                  ) : (
                    <span className="shrink-0 text-[15px] w-5 mt-0.5 text-[var(--fg-faint)]">
                      {bullet}
                    </span>
                  )}
                  <input
                    ref={inlineRef}
                    type="text"
                    value={inlineText}
                    onChange={(e) => setInlineText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddIdea()}
                    placeholder={isChecklist ? "add an item…" : "add an idea…"}
                    className="font-[family-name:var(--font-caveat)] text-base flex-1 bg-transparent border-none outline-none text-[var(--terra)] placeholder:text-[var(--terra)]"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Book list */
            <>
              {list.items.length > 4 && (
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="search by title or author…"
                  className="underline-input mb-4"
                />
              )}
              <div className="space-y-2.5 mb-3">
                {list.items
                  .filter((item: ListItem) => {
                    if (!itemSearch.trim()) return true;
                    const q = itemSearch.toLowerCase();
                    return (
                      item.title.toLowerCase().includes(q) ||
                      (item.author ?? "").toLowerCase().includes(q)
                    );
                  })
                  .map((item: ListItem, index: number) => {
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
                        className={`group flex gap-3.5 items-center bg-[var(--bg-surface)] rounded-xl px-4 py-3 border border-[var(--border-light)] transition-all ${draggingId === item.id ? "opacity-40" : "hover:translate-x-1"}`}
                        {...(itemSearch.trim()
                          ? {}
                          : itemProps(index, item.id))}
                      >
                        {/* Drag handle */}
                        {!itemSearch.trim() && (
                          <span className="cursor-grab active:cursor-grabbing text-[var(--fg-faint)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none text-base">
                            ⠿
                          </span>
                        )}

                        {item.coverUrl ? (
                          <BookCover
                            coverUrl={item.coverUrl}
                            title={item.title}
                            className="shrink-0 rounded-sm w-[38px] h-[54px]"
                          />
                        ) : (
                          <svg
                            viewBox="0 0 38 54"
                            className="shrink-0 rounded-sm w-[38px] h-[54px] shadow-[var(--shadow-spine-card)]"
                          >
                            <rect
                              width="38"
                              height="54"
                              rx="3"
                              fill={spineColor(item.title)}
                            />
                            <rect
                              x="4"
                              y="8"
                              width="30"
                              height="1.5"
                              rx="0.75"
                              fill="var(--spine-gloss-line)"
                            />
                          </svg>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-[13px] font-semibold text-[var(--fg-heading)] leading-snug">
                            {item.title}
                          </p>
                          {item.author && (
                            <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                              {item.author}
                            </p>
                          )}
                          <input
                            type="text"
                            value={item.notes ?? ""}
                            onChange={(e) =>
                              handleUpdateItemNotes(item.id, e.target.value)
                            }
                            placeholder="add a note…"
                            className="font-[family-name:var(--font-caveat)] text-xs text-[var(--terra)] bg-transparent border-none outline-none w-full mt-1 placeholder:text-[var(--terra)]/40"
                          />
                        </div>

                        {/* Status pill */}
                        {status && (
                          <span
                            className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border opacity-70 group-hover:opacity-100 transition-opacity ${STATUS_COLOR[status]} border-current`}
                          >
                            {STATUS_SYMBOL[status]}{" "}
                            {STATUS_LABEL[status] === "want to read"
                              ? "tbr"
                              : STATUS_LABEL[status]}
                          </span>
                        )}

                        {/* Remove */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-lg text-[var(--fg-faint)] hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Add book row */}
              {showAddBook ? (
                <div className="rounded-xl px-4 py-3 border border-dashed border-[var(--border-light)] bg-[var(--bg-surface)]">
                  <CatalogSearch
                    value={draftTitle}
                    onChange={(v) => setDraftTitle(v)}
                    onSelect={async (s: CatalogEntry) => {
                      setDraftTitle(s.title);
                      setDraftAuthor(s.author);
                      try {
                        const res = await fetch("/api/catalog/upsert", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: s.title,
                            author: s.author,
                            coverUrl: s.coverUrl,
                            isbn: s.isbn,
                            releaseDate: s.releaseDate,
                            genres: s.genres,
                            pageCount: s.pageCount,
                          }),
                        });
                        const { id } = await res.json();
                        setDraftBookId(id ?? "");
                      } catch {
                        setDraftBookId("");
                      }
                    }}
                    onSubmit={handleAddBook}
                    placeholder="search for a book to add…"
                    className="mb-1"
                    libraryEntries={libraryEntries}
                  />
                  <input
                    type="text"
                    value={draftAuthor}
                    onChange={(e) => setDraftAuthor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddBook()}
                    placeholder="author"
                    className="text-xs text-[var(--fg-muted)] bg-transparent border-none outline-none w-full placeholder:text-[var(--fg-faint)]"
                  />
                  <div className="flex gap-3 mt-2 pt-2 border-t border-[var(--border-light)]">
                    <button
                      onClick={handleAddBook}
                      disabled={!draftTitle.trim() || adding}
                      className="text-xs font-semibold text-[var(--plum)] hover:text-[var(--plum-light)] transition-colors disabled:opacity-30"
                    >
                      add ↵
                    </button>
                    <button
                      onClick={() => {
                        setShowAddBook(false);
                        setDraftTitle("");
                        setDraftAuthor("");
                        setDraftBookId("");
                      }}
                      className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddBook(true)}
                  className="w-full flex gap-2.5 items-center px-4 py-3 rounded-xl border border-dashed border-[var(--border-light)] hover:border-[var(--terra)] hover:bg-[var(--terra)]/4 transition-all font-[family-name:var(--font-caveat)] text-[13px] text-[var(--fg-muted)] hover:text-[var(--terra)]"
                >
                  <span className="text-lg">＋</span>
                  search for a book to add…
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="border-l border-[var(--border-light)] px-5 py-6">
          {/* Item count */}
          <p className="section-label mb-2">{isIdeaType ? "Ideas" : "Books"}</p>
          <div className="rounded-xl px-4 py-3 text-center mb-5 border border-[var(--border-light)] bg-[var(--bg-surface)]">
            <p className="font-serif text-[28px] font-bold text-[var(--plum)] leading-none">
              {list.items.length}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-[var(--fg-faint)] mt-1 font-semibold">
              {itemLabel}
            </p>
          </div>

          {/* Quick notes (book list only) */}
          {!isIdeaType && (
            <>
              <p className="section-label mb-2">Quick notes</p>
              <textarea
                value={list.description}
                onChange={(e) => {
                  const description = e.target.value;
                  setList((prev) => (prev ? { ...prev, description } : prev));
                  saveListField({ description });
                }}
                placeholder="notes about this list…"
                rows={5}
                className="w-full font-[family-name:var(--font-caveat)] text-sm text-[var(--fg-muted)] rounded-xl px-3 py-3 border border-[var(--border-light)] outline-none resize-none placeholder:text-[var(--fg-faint)] mb-5 bg-[var(--bg-surface)] leading-[2] bg-[repeating-linear-gradient(transparent,_transparent_28px,_var(--bg-muted-tag)_29px)]"
              />
            </>
          )}

          {/* Settings */}
          <p className="section-label mb-2">Settings</p>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setShowCoverModal(true)}
              className="flex items-center gap-2 text-xs text-[var(--fg-muted)] px-3 py-2 rounded-lg border border-[var(--border-light)] hover:border-[var(--fg-muted)] transition-colors text-left bg-[var(--bg-surface)]"
            >
              <PaletteIcon size={13} /> Change cover
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-xs text-red-500/70 px-3 py-2 rounded-lg border border-[var(--border-light)] hover:border-red-300 transition-colors text-left bg-[var(--bg-surface)]"
            >
              <TrashIcon size={13} /> Delete list
            </button>
          </div>
        </div>
      </div>

      {showCoverModal && (
        <CoverChangeModal
          initialColor={list.color}
          initialEmoji={list.emoji}
          onClose={() => setShowCoverModal(false)}
          onSave={handleSaveCover}
        />
      )}
    </div>
  );
}
