"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  addBookToGoal,
  deleteGoal,
  removeBookFromGoal,
  updateGoal,
} from "@/lib/goals";
import { toast } from "@/lib/toast";
import type { BookEntry, ReadingGoal } from "@/types";
import { ProgressBar } from "@/components/ProgressBar";

export function CustomGoalCard({
  goal,
  allEntries,
  onUpdate,
  onDelete,
  onBookAdded,
  onBookRemoved,
}: {
  goal: ReadingGoal;
  allEntries: BookEntry[];
  onUpdate: (id: string, patch: { target?: number; name?: string }) => void;
  onDelete: (id: string) => void;
  onBookAdded: (goalId: string, bookId: string) => void;
  onBookRemoved: (goalId: string, bookId: string) => void;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(goal.target);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const goalBooks = allEntries.filter((e) => goal.bookIds.includes(e.id));
  const percent = Math.min(100, Math.round((goalBooks.length / target) * 100));

  const scheduleSave = (patch: { target?: number; name?: string }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () =>
        updateGoal(goal.id, patch).catch(() =>
          toast("Something went wrong. Please try again."),
        ),
      600,
    );
  };

  const handleDelete = async () => {
    if (!confirm("Delete this goal?")) return;
    setDeleting(true);
    try {
      await deleteGoal(goal.id);
      onDelete(goal.id);
    } catch {
      toast("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  const handleAddBook = async (bookId: string) => {
    if (busy) return;
    setBusy(bookId);
    try {
      await addBookToGoal(goal.id, bookId);
      onBookAdded(goal.id, bookId);
      setSearch("");
      setShowPicker(false);
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    if (busy) return;
    setBusy(bookId);
    try {
      await removeBookFromGoal(goal.id, bookId);
      onBookRemoved(goal.id, bookId);
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const eligible = allEntries
    .filter(
      (e) =>
        !goal.bookIds.includes(e.id) &&
        (search.trim() === "" ||
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.author.toLowerCase().includes(search.toLowerCase())),
    )
    .slice(0, 12);

  return (
    <div className="border border-stone-200 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <input
          id={`custom-goal-${goal.id}-name`}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            onUpdate(goal.id, { name: e.target.value });
            scheduleSave({ name: e.target.value });
          }}
          placeholder="Goal name"
          className="flex-1 bg-transparent text-base font-semibold text-stone-800 focus:outline-none border-b border-transparent focus:border-stone-300 transition-colors placeholder:text-stone-300"
        />
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-stone-300 hover:text-red-400 transition-colors shrink-0"
        >
          {deleting ? "..." : "delete"}
        </button>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-3xl font-semibold text-stone-900">
            {goalBooks.length}
          </span>
          <span className="text-sm text-stone-400">
            of {target} · {percent}%
          </span>
        </div>
        <ProgressBar value={percent} percent color="plum" />
      </div>

      {/* Books in this goal */}
      {goalBooks.length > 0 && (
        <div className="space-y-0.5">
          {goalBooks.map((e) => (
            <div key={e.id} className="flex items-baseline gap-2 py-0.5 group">
              <span className="text-xs text-stone-300">·</span>
              <Link
                href={`/book/${e.id}`}
                className="text-sm text-stone-700 hover:text-stone-900 truncate flex-1"
              >
                {e.title}
              </Link>
              {e.author && (
                <span className="text-xs text-stone-400 shrink-0">
                  {e.author}
                </span>
              )}
              <button
                onClick={() => handleRemoveBook(e.id)}
                disabled={busy === e.id}
                className="text-xs text-stone-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add book picker */}
      {showPicker ? (
        <div>
          <input
            id={`custom-goal-${goal.id}-search`}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search your library..."
            autoFocus
            className="w-full bg-transparent border-b border-stone-300 pb-1 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:border-stone-600 transition-colors"
          />
          {eligible.length > 0 ? (
            <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
              {eligible.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleAddBook(e.id)}
                  disabled={busy === e.id}
                  className="w-full flex items-baseline gap-2 py-1 px-2 rounded hover:bg-stone-50 transition-colors text-left"
                >
                  <span className="text-sm text-stone-700 truncate flex-1">
                    {e.title}
                  </span>
                  {e.author && (
                    <span className="text-xs text-stone-400 shrink-0">
                      {e.author}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-300 mt-2">no books found</p>
          )}
          <button
            onClick={() => {
              setShowPicker(false);
              setSearch("");
            }}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors mt-3"
          >
            cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          + add book
        </button>
      )}

      {/* Edit target */}
      <div className="pt-4 border-t border-stone-100 flex items-baseline gap-2">
        <label className="text-xs text-stone-400">target</label>
        <input
          id={`custom-goal-${goal.id}-target`}
          type="number"
          value={target}
          min={1}
          onChange={(e) => {
            const val = Number(e.target.value);
            setTarget(val);
            onUpdate(goal.id, { target: val });
            scheduleSave({ target: val });
          }}
          className="w-20 bg-transparent border-b border-stone-200 pb-0.5 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors"
        />
        <span className="text-xs text-stone-400">books</span>
      </div>
    </div>
  );
}
