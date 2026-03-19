"use client";

import React, { useMemo } from "react";

interface Props {
  year: number;
  loggedDates: Set<string>;
  onToggle: (date: string) => void;
}

const MONTH_LABELS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const CELL = 16;
const GAP = 3;
const LABEL_W = 28;

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatTitle(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function HabitGrid({ year, loggedDates, onToggle }: Props) {
  const today = toDateStr(new Date());
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  // precompute days in each month
  const monthDays = useMemo(
    () => MONTH_LABELS.map((_, m) => new Date(year, m + 1, 0).getDate()),
    [year]
  );

  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ width: "max-content" }}>

        {/* day number header */}
        <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px repeat(31, ${CELL}px)`, gap: GAP, marginBottom: GAP }}>
          <div />
          {Array.from({ length: 31 }, (_, i) => (
            <div
              key={i}
              style={{ fontSize: 9, width: CELL }}
              className="text-stone-400 text-center leading-none flex items-end justify-center h-4"
            >
              {(i + 1) % 5 === 0 || i === 0 ? i + 1 : ""}
            </div>
          ))}
        </div>

        {/* month rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
          {MONTH_LABELS.map((label, monthIdx) => {
            const daysInMonth = monthDays[monthIdx];
            return (
              <div
                key={label}
                style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px repeat(31, ${CELL}px)`, gap: GAP }}
              >
                {/* month label */}
                <div
                  style={{ fontSize: 10, width: LABEL_W, height: CELL }}
                  className="text-stone-400 flex items-center font-mono"
                >
                  {label}
                </div>

                {/* day cells */}
                {Array.from({ length: 31 }, (_, dayIdx) => {
                  const day = dayIdx + 1;

                  if (day > daysInMonth) {
                    return <div key={day} style={{ width: CELL, height: CELL }} />;
                  }

                  const date = new Date(year, monthIdx, day);
                  const dateStr = toDateStr(date);
                  const isLogged = loggedDates.has(dateStr);
                  const isToday = dateStr === today;
                  const isFuture = date > now;
                  const isCurrentYear = year === new Date().getFullYear();

                  let cls = "";
                  if (isFuture && isCurrentYear) {
                    cls = "bg-stone-100 opacity-30 cursor-not-allowed";
                  } else if (isLogged) {
                    cls = isToday
                      ? "bg-emerald-500 hover:bg-emerald-400 ring-2 ring-offset-1 ring-emerald-300 cursor-pointer"
                      : "bg-emerald-500 hover:bg-emerald-400 cursor-pointer";
                  } else {
                    cls = isToday
                      ? "bg-white ring-2 ring-stone-400 hover:bg-stone-100 cursor-pointer"
                      : "bg-stone-100 hover:bg-stone-200 cursor-pointer";
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => !(isFuture && isCurrentYear) && onToggle(dateStr)}
                      title={formatTitle(date)}
                      disabled={isFuture && isCurrentYear}
                      style={{ width: CELL, height: CELL }}
                      className={`rounded transition-colors ${cls}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="flex items-center gap-5 mt-5">
          <div className="flex items-center gap-1.5">
            <div style={{ width: CELL, height: CELL }} className="rounded bg-stone-100" />
            <span style={{ fontSize: 10 }} className="text-stone-400">not read</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: CELL, height: CELL }} className="rounded bg-emerald-500" />
            <span style={{ fontSize: 10 }} className="text-stone-400">read</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: CELL, height: CELL }} className="rounded bg-white ring-2 ring-stone-400" />
            <span style={{ fontSize: 10 }} className="text-stone-400">today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
