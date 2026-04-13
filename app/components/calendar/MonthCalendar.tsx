"use client";

interface CalendarCell {
  day: number | null;
  dateStr: string;
}

interface MonthCalendarProps {
  cells: CalendarCell[];
  todayStr: string;
  selectedDate: string | null;
  loggedDates: Set<string>;
  streakDates: Set<string>;
  finishedByDate: Map<string, { title: string }>;
  quoteDateSet: Set<string>;
  onSelectDate: (dateStr: string) => void;
}

export function MonthCalendar({
  cells,
  todayStr,
  selectedDate,
  loggedDates,
  streakDates,
  finishedByDate,
  quoteDateSet,
  onSelectDate,
}: MonthCalendarProps) {
  return (
    <div className="mb-10 rounded-2xl overflow-hidden border border-[var(--border-light)]">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border-light)] bg-[var(--bg-surface)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center py-2 text-[10px] uppercase tracking-wider text-[var(--fg-faint)]">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 bg-[var(--bg-page)]">
        {cells.map((cell, i) => {
          if (!cell.day) {
            return <div key={i} className="aspect-square border-r border-b border-[var(--border-light)] opacity-30" />;
          }

          const { dateStr } = cell;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const isLogged = loggedDates.has(dateStr);
          const isStreak = streakDates.has(dateStr);
          const finished = finishedByDate.get(dateStr);
          const hasQuote = quoteDateSet.has(dateStr);
          const isSelected = selectedDate === dateStr;

          let bg = "transparent";
          if (isSelected) bg = "var(--bg-selected)";
          else if (isToday) bg = "var(--plum)";
          else if (finished) bg = "var(--bg-finished-day)";
          else if (isStreak && isLogged) bg = "var(--bg-streak)";
          else if (isLogged) bg = "var(--bg-logged)";

          const dayNumColor = isFuture ? "text-[var(--fg-faint)]" : isToday ? "text-white" : "text-[var(--fg)]";

          const inner = (
            <>
              <span className={`text-[11px] font-medium leading-none mb-1 w-5 h-5 flex items-center justify-center rounded-full ${dayNumColor}`}>
                {cell.day}
              </span>
              {finished && (
                <span className="text-[8px] leading-tight truncate w-full text-[var(--terra)]">
                  {finished.title.slice(0, 10)}{finished.title.length > 10 ? "…" : ""}
                </span>
              )}
              {isLogged && !finished && (
                <span
                  className="w-1 h-1 rounded-full absolute bottom-1.5 left-1/2 -translate-x-1/2"
                  style={{ background: isStreak ? "var(--sage)" : "var(--fg-faint)" }}
                />
              )}
              {hasQuote && (
                <span className="text-[8px] absolute top-1 right-1 text-[var(--gold)]">✦</span>
              )}
            </>
          );

          if (isFuture) {
            return (
              <div
                key={i}
                className="aspect-square border-r border-b border-[var(--border-light)] flex flex-col items-start justify-start p-1.5 relative opacity-45 cursor-default"
                style={{ background: bg }}
              >
                {inner}
              </div>
            );
          }

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className="aspect-square border-r border-b border-[var(--border-light)] flex flex-col items-start justify-start p-1.5 transition-colors hover:bg-[var(--bg-subtle)] relative text-left"
              style={{ background: bg }}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
