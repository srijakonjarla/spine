"use client";

import { useRef, useState } from "react";
import { updateGoal } from "@/lib/goals";
import { toast } from "@/lib/toast";
import type { ReadingGoal } from "@/types";
import { ProgressBar } from "@/components/ProgressBar";

export function AutoGoalCard({
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
      () =>
        updateGoal(goal.id, { target: val }).catch(() =>
          toast("Something went wrong. Please try again."),
        ),
      600,
    );
  };

  return (
    <div className="border border-stone-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400 uppercase tracking-widest">
          {goal.year} reading goal
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
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-label shrink-0 ${reached ? "text-white bg-plum border-plum" : "border-stone-200"}`}
              >
                {reached ? "✓" : ""}
              </span>
              {m}%
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-stone-100 flex flex-wrap items-baseline gap-2">
        <label className="text-xs text-stone-400">target</label>
        <input
          id="auto-goal-target"
          type="number"
          value={target}
          min={1}
          onChange={(e) => {
            const val = Number(e.target.value);
            setTarget(val);
            onUpdate(goal.id, { target: val });
            scheduleSave(val);
          }}
          className="w-16 sm:w-20 bg-transparent border-b border-stone-200 pb-0.5 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors"
        />
        <span className="text-xs text-stone-400">books</span>
      </div>
    </div>
  );
}
