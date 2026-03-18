"use client";

import React, { useMemo } from "react";

interface Props {
  year: number;
  loggedDates: Set<string>;
  onToggle: (date: string) => void;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function HabitGrid({ year, loggedDates, onToggle }: Props) {
  const { weeks, months } = useMemo(() => {
    const start = new Date(year, 0, 1);
    // rewind to Monday of the week containing Jan 1
    const dayOfWeek = start.getDay(); // 0=Sun
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - offset);

    const end = new Date(year, 11, 31);
    const weeks: Date[][] = [];
    const monthPositions: { label: string; col: number }[] = [];
    let seenMonths = new Set<number>();
    let col = 0;
    const cur = new Date(start);

    while (cur <= end || weeks.length === 0) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(cur);
        week.push(day);
        const m = day.getMonth();
        if (day.getFullYear() === year && !seenMonths.has(m)) {
          seenMonths.add(m);
          monthPositions.push({
            label: day.toLocaleDateString("en-US", { month: "short" }),
            col,
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
      col++;
      if (cur > end && weeks.length > 1) break;
    }

    return { weeks, months: monthPositions };
  }, [year]);

  const today = toDateStr(new Date());

  return (
    <div className="overflow-x-auto">
      <div style={{ display: "grid", gridTemplateColumns: `16px repeat(${weeks.length}, 11px)`, gap: "2px" }}>
        {/* month labels row */}
        <div />
        {weeks.map((_, i) => {
          const m = months.find((m) => m.col === i);
          return (
            <div key={`month-${i}`} className="text-[9px] text-stone-300 leading-none h-3">
              {m ? m.label : ""}
            </div>
          );
        })}

        {/* day rows */}
        {DAYS.map((dayLabel, row) => (
          <React.Fragment key={`row-${row}`}>
            <div className="text-[9px] text-stone-300 leading-none flex items-center">
              {row % 2 === 0 ? dayLabel : ""}
            </div>
            {weeks.map((week, col) => {
              const date = week[row];
              const dateStr = toDateStr(date);
              const inYear = date.getFullYear() === year;
              const isLogged = loggedDates.has(dateStr);
              const isToday = dateStr === today;
              const isFuture = date > new Date();

              return (
                <button
                  key={`${col}-${row}`}
                  onClick={() => inYear && !isFuture && onToggle(dateStr)}
                  title={inYear ? dateStr : ""}
                  disabled={!inYear || isFuture}
                  className={`w-[11px] h-[11px] rounded-sm transition-colors ${
                    !inYear
                      ? "bg-transparent"
                      : isFuture
                      ? "bg-stone-100"
                      : isLogged
                      ? "bg-stone-700 hover:bg-stone-500"
                      : isToday
                      ? "bg-stone-200 hover:bg-stone-300 ring-1 ring-stone-400"
                      : "bg-stone-100 hover:bg-stone-200"
                  }`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
