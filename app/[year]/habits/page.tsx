"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import HabitGrid from "@/components/HabitGrid";
import { getReadingLog, toggleDay, saveLogNote } from "@/lib/habits";
import type { ReadingLogEntry } from "@/types";

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function calcStreak(dates: Set<string>) {
  let count = 0;
  const cur = new Date();
  while (true) {
    const str = cur.toISOString().split("T")[0];
    if (!dates.has(str)) break;
    count++;
    cur.setDate(cur.getDate() - 1);
  }
  return count;
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });
}

function EntryRow({
  entry,
  onSave,
}: {
  entry: ReadingLogEntry;
  onSave: (id: string, note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.note);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = (val: string) => {
    setDraft(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveLogNote(entry.logDate, val);
      onSave(entry.id, val);
    }, 600);
  };

  if (editing) {
    return (
      <div className="py-2">
        <p className="text-xs text-stone-400 mb-1.5">{formatDate(entry.logDate)}</p>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => scheduleSave(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setEditing(false); }
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          rows={3}
          placeholder="what did you read today?"
          className="journal-surface journal-text w-full border border-[rgba(45,27,46,0.1)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[rgba(45,27,46,0.12)] resize-none placeholder:text-[#c4bfba]"
        />
        <p className="hint-text mt-1">↵ to save · esc to close</p>
      </div>
    );
  }

  if (draft.trim()) {
    return (
      <div
        className="py-2 cursor-text -mx-2 px-2 rounded-lg hover:bg-[rgba(45,27,46,0.03)] transition-colors"
        onClick={() => setEditing(true)}
      >
        <p className="text-xs text-stone-400 mb-1">{formatDate(entry.logDate)}</p>
        <p className="journal-text whitespace-pre-wrap">{draft}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs text-stone-400">{formatDate(entry.logDate)}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-stone-300 hover:text-stone-600 transition-colors"
      >
        + add note
      </button>
    </div>
  );
}

export default function HabitsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);

  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<ReadingLogEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReadingLog(year).then((log) => {
      const dates = new Set(log.map((e) => e.logDate));
      setLoggedDates(dates);
      setStreak(calcStreak(dates));
      setEntries([...log].reverse()); // most recent first
    }).catch(console.error).finally(() => setLoading(false));
  }, [year]);

  const handleToggle = async (date: string) => {
    const next = new Set(loggedDates);
    if (next.has(date)) {
      next.delete(date);
      setEntries((prev) => prev.filter((e) => e.logDate !== date));
    } else {
      next.add(date);
      const newEntry: ReadingLogEntry = { id: crypto.randomUUID(), logDate: date, note: "" };
      setEntries((prev) => [newEntry, ...prev].sort((a, b) => b.logDate.localeCompare(a.logDate)));
    }
    setLoggedDates(next);
    setStreak(calcStreak(next));
    await toggleDay(date);
  };

  const handleSaveNote = (id: string, note: string) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, note } : e));
  };

  const withNotes = entries.filter((e) => e.note.trim());
  const withoutNotes = entries.filter((e) => !e.note.trim());

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/" className="back-link">← home</Link>
        </div>

        <div className="mb-10 pb-8 border-b border-stone-200">
          <p className="text-xs text-stone-300 mb-2 tracking-widest uppercase">reading journal · {year}</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[#2D1B2E] tracking-tight">habit tracker</h1>
          {!loading && (
            <p className="text-xs text-stone-400 mt-3">
              {loggedDates.size} days read · click a day to toggle
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { value: loggedDates.size, label: "days read" },
            { value: streak, label: "day streak" },
            { value: `${Math.round((loggedDates.size / (year === new Date().getFullYear() ? getDayOfYear() : 365)) * 100)}%`, label: "of year" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-xl font-semibold" style={{ color: "#7B9E87" }}>{value}</p>
              <p className="text-xs text-stone-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="mb-14">
          <HabitGrid year={year} loggedDates={loggedDates} onToggle={handleToggle} />
        </div>

        {/* Journal entries */}
        {!loading && entries.length > 0 && (
          <div className="border-t border-stone-200 pt-10">
            <div className="flex items-baseline justify-between mb-6">
              <p className="section-label">journal entries</p>
              <span className="text-xs text-stone-300">{withNotes.length} with notes</span>
            </div>

            <div className="space-y-1">
              {withNotes.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onSave={handleSaveNote} />
              ))}
            </div>

            {withoutNotes.length > 0 && (
              <div className={`${withNotes.length > 0 ? "mt-8 pt-6 border-t border-stone-100" : ""}`}>
                {withNotes.length > 0 && (
                  <p className="section-label mb-3">days without notes</p>
                )}
                <div className="space-y-0.5">
                  {withoutNotes.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} onSave={handleSaveNote} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="border-t border-stone-200 pt-10">
            <p className="text-xs text-stone-400">No days logged yet. Click any day above to mark it as a reading day.</p>
          </div>
        )}
      </div>
    </div>
  );
}
