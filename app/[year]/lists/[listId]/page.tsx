"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getList,
  updateList,
  deleteList,
  removeListItem,
  reorderListItems,
} from "@/lib/lists";
import { useDragReorder } from "@/hooks/useDragReorder";
import { useListItemFields } from "@/hooks/useListItemFields";
import { getEntries } from "@/lib/db";
import { CoverChangeModal } from "@/components/lists/CoverChangeModal";
import { LibraryLoanList } from "@/components/lists/LibraryLoanList";
import { BookLedgerList } from "@/components/lists/BookLedgerList";
import { IdeaList } from "@/components/lists/IdeaList";
import { BookListItems } from "@/components/lists/BookListItems";
import { ListSidebar } from "@/components/lists/ListSidebar";
import type { BookList, BookEntry, ListItem } from "@/types";
import { toast } from "@/lib/toast";
import {
  BooksIcon,
  LightbulbIcon,
  CheckSquareIcon,
  ListBulletsIcon,
  BookOpenIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { BookmarkButton } from "@/components/BookmarkButton";
import type { Icon } from "@phosphor-icons/react";
import { coverGradientStyle } from "@/components/lists/coverConstants";

const LIST_TYPE_LABELS: Record<string, string> = {
  book_list: "book list",
  idea_list: "idea list",
  checklist: "checklist",
  bullet_list: "bullet points",
  library_loan: "library loans",
  book_ledger: "book ledger",
};
const LIST_TYPE_ICONS: Record<string, Icon> = {
  book_list: BooksIcon,
  idea_list: LightbulbIcon,
  checklist: CheckSquareIcon,
  bullet_list: ListBulletsIcon,
  library_loan: BookOpenIcon,
  book_ledger: TagIcon,
};

export default function ListDetailPage() {
  const { year, listId } = useParams<{ year: string; listId: string }>();
  const router = useRouter();

  const [list, setList] = useState<BookList | null>(null);
  const [libraryEntries, setLibraryEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCoverModal, setShowCoverModal] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    updateNotes: handleUpdateItemNotes,
    updateDate: handleUpdateItemDate,
    updatePrice: handleUpdateItemPrice,
    updateType: handleUpdateItemType,
  } = useListItemFields(setList);

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
      .catch(() => toast("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, [listId, year, router]);

  const saveListField = useCallback(
    (patch: Parameters<typeof updateList>[1]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateList(listId, patch), 600);
    },
    [listId],
  );

  const handleToggleCheck = (id: string, currentType: string) => {
    const next = currentType === "done" ? "" : "done";
    handleUpdateItemType(id, next);
  };

  const handleRemoveItem = async (id: string) => {
    setList((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev,
    );
    await removeListItem(id, listId);
  };

  const handleItemAdded = (item: ListItem) => {
    setList((prev) => (prev ? { ...prev, items: [...prev.items, item] } : prev));
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

  if (!list) return <div className="page" />;

  const isIdeaType = ["idea_list", "bullet_list", "checklist"].includes(list.listType);
  const isChecklist = list.listType === "checklist";
  const isLibraryLoan = list.listType === "library_loan";
  const isBookLedger = list.listType === "book_ledger";
  const bullet = list.bulletSymbol || "→";
  const itemLabel = isIdeaType
    ? "ideas"
    : isLibraryLoan
      ? "loans"
      : isBookLedger
        ? "entries"
        : "books";
  const today = new Date().toISOString().split("T")[0];
  const TypeIcon = LIST_TYPE_ICONS[list.listType] ?? BooksIcon;

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
        className="relative px-15 py-8 mt-3 rounded-xl overflow-hidden"
        style={coverGradientStyle(list.color)}
      >
        <div className="absolute bottom-0 right-0 w-44 h-44 rounded-full pointer-events-none translate-x-1/2 translate-y-1/2 [background:var(--cover-glow-orb)]" />
        <p className="flex items-center gap-1.5 font-[family-name:var(--font-caveat)] text-sm mb-1 relative z-10 text-white/55">
          <TypeIcon size={14} />
          {LIST_TYPE_LABELS[list.listType] ?? "list"}
        </p>
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
          {isLibraryLoan ? (
            <LibraryLoanList
              listId={listId}
              items={list.items}
              libraryEntries={libraryEntries}
              draggingId={draggingId}
              itemProps={itemProps}
              today={today}
              onUpdateNotes={handleUpdateItemNotes}
              onUpdateDate={handleUpdateItemDate}
              onUpdatePrice={handleUpdateItemPrice}
              onUpdateType={handleUpdateItemType}
              onRemove={handleRemoveItem}
              onItemAdded={handleItemAdded}
            />
          ) : isBookLedger ? (
            <BookLedgerList
              listId={listId}
              items={list.items}
              libraryEntries={libraryEntries}
              onUpdateNotes={handleUpdateItemNotes}
              onUpdateDate={handleUpdateItemDate}
              onUpdatePrice={handleUpdateItemPrice}
              onUpdateType={handleUpdateItemType}
              onRemove={handleRemoveItem}
              onItemAdded={handleItemAdded}
            />
          ) : isIdeaType ? (
            <IdeaList
              listId={listId}
              items={list.items}
              isChecklist={isChecklist}
              bullet={bullet}
              draggingId={draggingId}
              itemProps={itemProps}
              onToggleCheck={handleToggleCheck}
              onRemove={handleRemoveItem}
              onItemAdded={handleItemAdded}
              onBulletSymbolChange={(sym) => {
                setList((prev) => prev ? { ...prev, bulletSymbol: sym } : prev);
                saveListField({ bulletSymbol: sym });
              }}
            />
          ) : (
            <BookListItems
              listId={listId}
              listType={list.listType}
              items={list.items}
              libraryEntries={libraryEntries}
              draggingId={draggingId}
              itemProps={itemProps}
              onUpdateNotes={handleUpdateItemNotes}
              onRemove={handleRemoveItem}
              onItemAdded={handleItemAdded}
            />
          )}
        </div>

        {/* ── Right sidebar ── */}
        <ListSidebar
          list={list}
          isIdeaType={isIdeaType}
          isLibraryLoan={isLibraryLoan}
          isBookLedger={isBookLedger}
          itemLabel={itemLabel}
          onDescriptionChange={(description) => {
            setList((prev) => (prev ? { ...prev, description } : prev));
            saveListField({ description });
          }}
          onShowCoverModal={() => setShowCoverModal(true)}
          onDelete={handleDelete}
        />
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
