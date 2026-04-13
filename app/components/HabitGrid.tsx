"use client";

import { useMemo } from "react";

interface Props {
  year: number;
  loggedDates: Set<string>;
  onToggle: (date: string) => void;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const DOW_LABELS = ["su", "mo", "tu", "we", "th", "fr", "sa"];


function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function MonthCalendar({
  year,
  month,
  loggedDates,
  onToggle,
}: {
  year: number;
  month: number;
  loggedDates: Set<string>;
  onToggle: (date: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const isCurrentYear = year === new Date().getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun

  // build flat cell array: nulls for padding, day numbers for real days
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const loggedCount = useMemo(() => {
    let n = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (loggedDates.has(toDateStr(year, month, d))) n++;
    }
    return n;
  }, [loggedDates, year, month, daysInMonth]);

  return (
    <div>
      {/* month header */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-xs font-semibold text-stone-500 tracking-widest uppercase">{MONTH_NAMES[month]}</span>
        <span className="text-xs text-stone-300">
          {loggedCount}/{daysInMonth}
        </span>
        <span className="flex-1 border-b border-dotted border-stone-200 mb-0.5" />
      </div>

      {/* calendar grid */}
      <div className="grid grid-cols-7 gap-[5px]">
        {/* day-of-week header */}
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="text-[9px] h-[14px] w-9 text-stone-300 text-center flex items-center justify-center font-mono"
          >
            {d}
          </div>
        ))}

        {/* weeks */}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (!day) {
              return <div key={`${wi}-${di}`} className="w-9 h-9" />;
            }

            const dateStr = toDateStr(year, month, day);
            const isLogged = loggedDates.has(dateStr);
            const isToday = dateStr === today;
            const date = new Date(year, month, day);
            const isFuture = date > now;

            const cls =
              isFuture && isCurrentYear ? "bg-stone-100 opacity-20 cursor-not-allowed text-stone-400" :
              isLogged && isToday       ? "cursor-pointer font-semibold ring-2 ring-offset-1 ring-sage bg-[var(--bg-sage-25)] text-sage" :
              isLogged                  ? "cursor-pointer font-semibold bg-[var(--bg-sage-18)] text-sage" :
              isToday                   ? "cursor-pointer font-bold text-white bg-plum shadow-[var(--shadow-today-cell)]" :
                                          "cursor-pointer text-stone-400 bg-stone-100 hover:bg-stone-200";

            return (
              <button
                key={`${wi}-${di}`}
                title={date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                disabled={isFuture && isCurrentYear}
                onClick={() => !(isFuture && isCurrentYear) && onToggle(dateStr)}
                className={`w-9 h-9 text-[10px] rounded flex items-center justify-center transition-colors ${cls}`}
              >
                {day}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function HabitGrid({ year, loggedDates, onToggle }: Props) {
  const currentMonth = new Date().getMonth();
  const isCurrentYear = year === new Date().getFullYear();
  const visibleMonths = isCurrentYear
    ? Array.from({ length: currentMonth + 1 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-10">
      {visibleMonths.map((month) => (
        <MonthCalendar
          key={month}
          year={year}
          month={month}
          loggedDates={loggedDates}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
