"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getGoals,
  setGoal,
  updateGoal,
  deleteGoal,
  addBookToGoal,
  removeBookFromGoal,
} from "@/lib/goals";
import { getEntries } from "@/lib/db";
import type { ReadingGoal, BookEntry } from "@/types";
import { ProgressBar } from "@/components/ProgressBar";
import { PageHeader } from "@/components/PageHeader";

// ─── Auto goal card ───────────────────────────────────────────────────────────
function AutoGoalCard({
  goal,
  finishedCount,
  onUpdate,
}: {
  goal: ReadingGoal;
  finishedCount: number;
  onUpdate: (id: string, patch: { target?: number; name?: string }) => void;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [target, setTarget] = useState(goal.target);
  const percent = Math.min(100, Math.round((finishedCount / target) * 100));

  const scheduleSave = (val: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () => updateGoal(goal.id, { target: val }).catch(console.error),
      600,
    );
  };

  return (
    <div className="border border-stone-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400 uppercase tracking-widest">
          2026 reading goal
        </p>
        <span className="text-xs text-stone-300">auto-tracked</span>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-4xl font-semibold text-stone-900">
            {finishedCount}
          </span>
          <span className="text-sm text-stone-400">
            of {target} books · {percent}%
          </span>
        </div>
        <ProgressBar value={percent} percent color="plum" />
      </div>

      <div className="flex gap-5">
        {[25, 50, 75, 100].map((m) => {
          const reached = percent >= m;
          return (
            <div
              key={m}
              className={`flex items-center gap-1.5 text-xs ${reached ? "text-stone-700" : "text-stone-300"}`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] shrink-0 ${reached ? "text-white bg-plum border-plum" : "border-stone-200"}`}
              >
                {reached ? "✓" : ""}
              </span>
              {m}%
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-stone-100 flex items-baseline gap-2">
        <label className="text-xs text-stone-400">target</label>
        <input
          type="number"
          value={target}
          min={1}
          onChange={(e) => {
            const val = Number(e.target.value);
            setTarget(val);
            onUpdate(goal.id, { target: val });
            scheduleSave(val);
          }}
          className="w-20 bg-transparent border-b border-stone-200 pb-0.5 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors"
        />
        <span className="text-xs text-stone-400">books</span>
      </div>
    </div>
  );
}

// ─── Custom goal card ─────────────────────────────────────────────────────────
function CustomGoalCard({
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
      () => updateGoal(goal.id, patch).catch(console.error),
      600,
    );
  };

  const handleDelete = async () => {
    if (!confirm("Delete this goal?")) return;
    setDeleting(true);
    try {
      await deleteGoal(goal.id);
      onDelete(goal.id);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  // Books eligible to add: not already in goal
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

// ─── Page ─────────────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();

export default function GoalPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [allEntries, setAllEntries] = useState<BookEntry[]>([]);
  const [finishedCount, setFinishedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [setupTarget, setSetupTarget] = useState("");
  const [setupName, setSetupName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getGoals(year), getEntries({ year }), getEntries()])
      .then(async ([gs, yearEntries, allEntries]) => {
        let resolved = gs;
        const finished = yearEntries.filter(
          (b) =>
            b.status === "finished" &&
            b.dateFinished?.startsWith(`${year}`),
        );
        setFinishedCount(finished.length);
        setAllEntries(allEntries);

        // Auto-create the yearly goal if this is the current year and none exists
        if (year === CURRENT_YEAR && !gs.some((g) => g.isAuto)) {
          const created = await setGoal(year, 12, `${year} reading goal`, true);
          resolved = [created, ...gs];
        }

        setGoals(resolved);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const handleUpdate = (
    id: string,
    patch: { target?: number; name?: string },
  ) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const handleDelete = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleBookAdded = (goalId: string, bookId: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, bookIds: [...g.bookIds, bookId] } : g,
      ),
    );
  };

  const handleBookRemoved = (goalId: string, bookId: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, bookIds: g.bookIds.filter((id) => id !== bookId) }
          : g,
      ),
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(setupTarget);
    if (!target || target < 1) return;
    setSaving(true);
    try {
      const created = await setGoal(year, target, setupName.trim(), false);
      setGoals((prev) => [...prev, created]);
      setSetupTarget("");
      setSetupName("");
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const autoGoal = goals.find((g) => g.isAuto);
  const customGoals = goals.filter((g) => !g.isAuto);

  if (loading) {
    return (
      <div className="page">
        <div className="page-content animate-pulse">
          <div className="h-4 w-16 bg-stone-200 rounded mb-8" />
          <div className="h-8 w-48 bg-stone-200 rounded mb-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/" className="back-link">
            ← home
          </Link>
        </div>

        <PageHeader
          title="reading goals"
          eyebrow={`reading journal · ${year}`}
        />

        <div className="space-y-4 mb-8">
          {/* Auto yearly goal */}
          {autoGoal && (
            <AutoGoalCard
              goal={autoGoal}
              finishedCount={finishedCount}
              onUpdate={handleUpdate}
            />
          )}

          {/* Custom goals */}
          {customGoals.map((goal) => (
            <CustomGoalCard
              key={goal.id}
              goal={goal}
              allEntries={allEntries}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onBookAdded={handleBookAdded}
              onBookRemoved={handleBookRemoved}
            />
          ))}
        </div>

        {/* Add custom goal */}
        {showAdd ? (
          <form
            onSubmit={handleCreate}
            className="border border-stone-200 rounded-xl p-6 space-y-4"
          >
            <p className="section-label">new custom goal</p>
            <div>
              <label className="text-xs text-stone-400 block mb-1">name</label>
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="e.g. Read more non-fiction"
                autoFocus
                className="w-full bg-transparent border-b border-stone-200 pb-1 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                target books
              </label>
              <input
                type="number"
                value={setupTarget}
                onChange={(e) => setSetupTarget(e.target.value)}
                placeholder="12"
                min={1}
                className="w-full bg-transparent border-b border-stone-200 pb-1 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!setupTarget || saving}
                className="text-sm text-white bg-stone-900 px-5 py-2 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                {saving ? "saving..." : "add goal"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setSetupTarget("");
                  setSetupName("");
                }}
                className="text-sm text-stone-400 hover:text-stone-700 transition-colors px-4 py-2"
              >
                cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
          >
            + add custom goal
          </button>
        )}
      </div>
    </div>
  );
}
