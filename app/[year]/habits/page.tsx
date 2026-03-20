"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import HabitGrid from "@/components/HabitGrid";
import { StatBlock } from "@/components/StatBlock";
import { getReadingLog, toggleDay } from "@/lib/habits";

export default function HabitsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getReadingLog(year).then((log) => {
      const dates = new Set(log.map((e) => e.logDate));
      setLoggedDates(dates);
      setStreak(calcStreak(dates));
    }).catch(console.error);
  }, [year]);

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

  const handleToggle = async (date: string) => {
    const next = new Set(loggedDates);
    if (next.has(date)) {
      next.delete(date);
    } else {
      next.add(date);
    }
    setLoggedDates(next);
    setStreak(calcStreak(next));
    await toggleDay(date);
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href={`/${year}`} className="back-link">← {year}</Link>
        </div>

        <div className="mb-10 pb-8 border-b border-stone-200">
          <p className="text-xs text-stone-300 mb-2 tracking-widest uppercase">reading journal · {year}</p>
          <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">habit tracker</h1>
          <p className="text-xs text-stone-400 mt-3">click a day to mark it as read</p>
        </div>

        <div className="mb-10">
          <HabitGrid year={year} loggedDates={loggedDates} onToggle={handleToggle} />
        </div>

        <div className="border-t border-stone-200 pt-6 grid grid-cols-3 gap-4">
          <StatBlock value={loggedDates.size} label="days read" />
          <StatBlock value={streak} label="day streak" />
          <StatBlock
            value={`${Math.round((loggedDates.size / (year === new Date().getFullYear() ? getDayOfYear() : 365)) * 100)}%`}
            label="of year"
          />
        </div>
      </div>
    </div>
  );
}

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
