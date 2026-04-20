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
    <div className="mb-10 rounded-2xl overflow-hidden border border-line">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-line bg-surface">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-center py-2 text-detail uppercase tracking-wider text-fg-faint"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 bg-page">
        {cells.map((cell, i) => {
          if (!cell.day) {
            return (
              <div
                key={i}
                className="aspect-square border-r border-b border-line opacity-30"
              />
            );
          }

          const { dateStr } = cell;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const isLogged = loggedDates.has(dateStr);
          const isStreak = streakDates.has(dateStr);
          const finished = finishedByDate.get(dateStr);
          const hasQuote = quoteDateSet.has(dateStr);
          const isSelected = selectedDate === dateStr;

          const bgClass = isSelected
            ? "bg-selected"
            : isToday
              ? "bg-plum"
              : finished
                ? "bg-[var(--bg-finished-day)]"
                : isStreak && isLogged
                  ? "bg-[var(--bg-streak)]"
                  : isLogged
                    ? "bg-[var(--bg-logged)]"
                    : "bg-transparent";

          const dayNumColor = isFuture
            ? "text-fg-faint"
            : isToday
              ? "text-white"
              : "text-fg";

          const inner = (
            <>
              <span
                className={`text-caption font-medium leading-none mb-1 w-5 h-5 flex items-center justify-center rounded-full ${dayNumColor}`}
              >
                {cell.day}
              </span>
              {finished && (
                <span className="text-micro-plus leading-tight truncate w-full text-terra">
                  {finished.title.slice(0, 10)}
                  {finished.title.length > 10 ? "…" : ""}
                </span>
              )}
              {isLogged && !finished && (
                <span
                  className={`w-1 h-1 rounded-full absolute bottom-1.5 left-1/2 -translate-x-1/2 ${isStreak ? "bg-sage" : "bg-fg-faint"}`}
                />
              )}
              {hasQuote && (
                <span className="text-micro-plus absolute top-1 right-1 text-gold">
                  ✦
                </span>
              )}
            </>
          );

          if (isFuture) {
            return (
              <div
                key={i}
                className={`aspect-square border-r border-b border-line flex flex-col items-start justify-start p-1.5 relative opacity-45 cursor-default ${bgClass}`}
              >
                {inner}
              </div>
            );
          }

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square border-r border-b border-line flex flex-col items-start justify-start p-1.5 transition-colors hover:bg-subtle relative text-left ${bgClass}`}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
