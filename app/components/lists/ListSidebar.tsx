"use client";

import { PaletteIcon, TrashIcon } from "@phosphor-icons/react";
import type { BookList } from "@/types";

interface Props {
  list: BookList;
  isIdeaType: boolean;
  isLibraryLoan: boolean;
  isBookLedger: boolean;
  itemLabel: string;
  onDescriptionChange: (desc: string) => void;
  onShowCoverModal: () => void;
  onDelete: () => void;
}

export function ListSidebar({
  list,
  isIdeaType,
  isLibraryLoan,
  isBookLedger,
  itemLabel,
  onDescriptionChange,
  onShowCoverModal,
  onDelete,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  // Library loan stats
  const loansOut = list.items.filter((i) => i.type !== "returned").length;
  const loansReturned = list.items.filter((i) => i.type === "returned").length;
  const loansOverdue = list.items.filter(
    (i) => i.releaseDate && i.releaseDate < today && i.type !== "returned",
  ).length;
  const moneySaved = list.items.reduce(
    (sum, i) => sum + (parseFloat(i.price) || 0),
    0,
  );

  // Book ledger stats
  const totalSpent = list.items
    .filter((i) => i.type === "bought" || i.type === "gifted")
    .reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
  const totalEarned = list.items
    .filter((i) => i.type === "sold")
    .reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);

  return (
    <div className="border-l border-[var(--border-light)] px-5 py-6">
      {/* Item count */}
      <p className="section-label mb-2">
        {isIdeaType
          ? "Ideas"
          : isLibraryLoan
            ? "Loans"
            : isBookLedger
              ? "Entries"
              : "Books"}
      </p>
      <div className="rounded-xl px-4 py-3 text-center mb-5 border border-[var(--border-light)] bg-[var(--bg-surface)]">
        <p className="font-serif text-[28px] font-bold text-[var(--plum)] leading-none">
          {list.items.length}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-[var(--fg-faint)] mt-1 font-semibold">
          {itemLabel}
        </p>
      </div>

      {/* Library loan stats */}
      {isLibraryLoan && (
        <>
          <p className="section-label mb-1.5">Library / Branch</p>
          <textarea
            value={list.description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="e.g. Brooklyn Public Library, Central Branch"
            rows={2}
            className="w-full font-[family-name:var(--font-caveat)] text-sm text-[var(--fg-muted)] rounded-xl px-3 py-2.5 border border-[var(--border-light)] outline-none resize-none placeholder:text-[var(--fg-faint)] mb-4 bg-[var(--bg-surface)]"
          />

          <p className="section-label mb-2">Activity</p>
          <div className="rounded-xl px-4 py-3 border border-[var(--border-light)] bg-[var(--bg-surface)] mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">checked out</span>
              <span className="text-xs font-semibold text-terra">{loansOut}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">returned</span>
              <span className="text-xs font-semibold text-sage">{loansReturned}</span>
            </div>
            {loansOverdue > 0 && (
              <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-2">
                <span className="text-xs text-[var(--fg-muted)]">overdue</span>
                <span className="text-xs font-semibold text-red-400">{loansOverdue}</span>
              </div>
            )}
          </div>

          {moneySaved > 0 && (
            <>
              <p className="section-label mb-2">Savings</p>
              <div className="rounded-xl px-4 py-3 border border-[var(--border-light)] bg-[var(--bg-surface)] mb-4">
                <p className="text-[11px] text-[var(--fg-faint)] mb-0.5">
                  retail value borrowed
                </p>
                <p className="font-serif text-[22px] font-bold text-sage leading-none">
                  ${moneySaved.toFixed(2)}
                </p>
                <p className="font-[family-name:var(--font-caveat)] text-[12px] text-[var(--fg-muted)] mt-1">
                  saved by using the library
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* Book ledger stats */}
      {isBookLedger && (
        <>
          <p className="section-label mb-2">Summary</p>
          <div className="rounded-xl px-4 py-3 border border-[var(--border-light)] bg-[var(--bg-surface)] mb-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">spent</span>
              <span className="text-xs font-semibold text-terra">
                ${totalSpent.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">earned</span>
              <span className="text-xs font-semibold text-sage">
                ${totalEarned.toFixed(2)}
              </span>
            </div>
            {totalEarned > 0 && (
              <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-2">
                <span className="text-xs text-[var(--fg-muted)]">net</span>
                <span
                  className={`text-xs font-semibold ${totalEarned - totalSpent >= 0 ? "text-sage" : "text-terra"}`}
                >
                  {totalEarned - totalSpent >= 0 ? "+" : ""}$
                  {(totalEarned - totalSpent).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick notes (book list only) */}
      {!isIdeaType && !isLibraryLoan && !isBookLedger && (
        <>
          <p className="section-label mb-2">Quick notes</p>
          <textarea
            value={list.description}
            onChange={(e) => onDescriptionChange(e.target.value)}
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
          onClick={onShowCoverModal}
          className="flex items-center gap-2 text-xs text-[var(--fg-muted)] px-3 py-2 rounded-lg border border-[var(--border-light)] hover:border-[var(--fg-muted)] transition-colors text-left bg-[var(--bg-surface)]"
        >
          <PaletteIcon size={13} /> Change cover
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 text-xs text-red-500/70 px-3 py-2 rounded-lg border border-[var(--border-light)] hover:border-red-300 transition-colors text-left bg-[var(--bg-surface)]"
        >
          <TrashIcon size={13} /> Delete list
        </button>
      </div>
    </div>
  );
}
