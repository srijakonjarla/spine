"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { setGoal } from "@/lib/goals";
import { useYear } from "@/providers/YearContext";
import { toast } from "@/lib/toast";
import type { ReadingGoal } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { AutoGoalCard } from "@/components/goals/AutoGoalCard";
import { CustomGoalCard } from "@/components/goals/CustomGoalCard";
import { YearGoalSkeleton } from "@/components/skeletons/YearGoalSkeleton";

// ─── Page ─────────────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();

export default function GoalPage() {
  const {
    year,
    loading: yearLoading,
    goals: contextGoals,
    setGoals,
    allEntries,
    finishedBooks,
  } = useYear();

  const [goals, setLocalGoals] = useState<ReadingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [setupTarget, setSetupTarget] = useState("");
  const [setupName, setSetupName] = useState("");
  const [saving, setSaving] = useState(false);

  // Mirror context goals into local state. Yearly auto goal is created
  // explicitly by the user via the empty-state CTA below — no lazy insert.
  useEffect(() => {
    if (yearLoading) return;
    setLocalGoals(contextGoals);
    setLoading(false);
  }, [yearLoading, contextGoals]);

  const [yearlyTarget, setYearlyTarget] = useState("");
  const [creatingYearly, setCreatingYearly] = useState(false);

  const handleCreateYearly = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    const target = Number(yearlyTarget);
    if (!target || target < 1) return;
    setCreatingYearly(true);
    try {
      const created = await setGoal(year, target, `${year} reading goal`, true);
      const next = [created, ...goals];
      setLocalGoals(next);
      setGoals(next);
      setYearlyTarget("");
    } catch {
      toast("Couldn't set the goal. Please try again.");
    } finally {
      setCreatingYearly(false);
    }
  };

  const finishedCount = finishedBooks.length;

  const handleUpdate = (
    id: string,
    patch: { target?: number; name?: string },
  ) => {
    setLocalGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    );
  };

  const handleDelete = (id: string) => {
    setLocalGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleBookAdded = (goalId: string, bookId: string) => {
    setLocalGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, bookIds: [...g.bookIds, bookId] } : g,
      ),
    );
  };

  const handleBookRemoved = (goalId: string, bookId: string) => {
    setLocalGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, bookIds: g.bookIds.filter((id) => id !== bookId) }
          : g,
      ),
    );
  };

  const handleCreate = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    const target = Number(setupTarget);
    if (!target || target < 1) return;
    setSaving(true);
    try {
      const created = await setGoal(year, target, setupName.trim(), false);
      setLocalGoals((prev) => [...prev, created]);
      setSetupTarget("");
      setSetupName("");
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const autoGoal = goals.find((g) => g.isAuto);
  const customGoals = goals.filter((g) => !g.isAuto);

  if (loading) return <YearGoalSkeleton />;

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
          {autoGoal ? (
            <AutoGoalCard
              goal={autoGoal}
              finishedCount={finishedCount}
              onUpdate={handleUpdate}
            />
          ) : (
            year === CURRENT_YEAR && (
              <form
                onSubmit={handleCreateYearly}
                className="border border-stone-200 rounded-xl p-6 space-y-4"
              >
                <p className="section-label">set a year goal</p>
                <p className="text-sm text-stone-500">
                  pick a number of books to read this year. you can edit it any
                  time.
                </p>
                <div>
                  <label className="text-xs text-stone-400 block mb-1">
                    target books
                  </label>
                  <input
                    id="year-goal-yearly-target"
                    type="number"
                    value={yearlyTarget}
                    onChange={(e) => setYearlyTarget(e.target.value)}
                    placeholder="12"
                    min={1}
                    autoFocus
                    className="w-full bg-transparent border-b border-stone-200 pb-1 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!yearlyTarget || creatingYearly}
                    className="text-sm text-white bg-stone-900 px-5 py-2 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
                  >
                    {creatingYearly ? "saving..." : "set goal"}
                  </button>
                </div>
              </form>
            )
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
                id="year-goal-custom-name"
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
                id="year-goal-custom-target"
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
