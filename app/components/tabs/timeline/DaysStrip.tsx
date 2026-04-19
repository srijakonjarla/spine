import type { ReactNode } from "react";

interface DaysStripProps {
  calendarDays: { date: Date; dateStr: string }[];
  thoughtsByDay: Record<string, number>;
  pagesByDay: Record<string, number>;
  finishedDateStr: string | null;
}

const LEGEND = [
  { bg: "var(--bg-sage-25)", label: "logged" },
  { bg: "var(--terra)", label: "finished" },
];

/** Horizontal strip of day chips above the timeline entries. */
export default function DaysStrip({
  calendarDays,
  thoughtsByDay,
  pagesByDay,
  finishedDateStr,
}: DaysStripProps) {
  if (calendarDays.length === 0) return null;

  // Walk the calendar, collapsing runs of empty days (3+) into a single gap chip.
  const chips: ReactNode[] = [];
  let i = 0;
  while (i < calendarDays.length) {
    const { date, dateStr } = calendarDays[i];
    const count = thoughtsByDay[dateStr] || 0;
    const pages = pagesByDay[dateStr] || 0;
    const isFinish = dateStr === finishedDateStr;
    const hasEntry = count > 0 || isFinish;

    if (!hasEntry) {
      let j = i;
      while (
        j < calendarDays.length &&
        !(thoughtsByDay[calendarDays[j].dateStr] || 0) &&
        calendarDays[j].dateStr !== finishedDateStr
      ) {
        j++;
      }
      const runLen = j - i;
      if (runLen <= 2) {
        for (let k = i; k < j; k++) {
          const d = calendarDays[k];
          chips.push(
            <div
              key={d.dateStr}
              className="timeline-day-gap"
              title={d.date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            >
              {d.date.getDate()}
            </div>,
          );
        }
      } else {
        const mid = calendarDays[i + Math.floor(runLen / 2)];
        chips.push(
          <div
            key={`gap-${mid.dateStr}`}
            className="timeline-day-gap"
            title={`${runLen} days with no entries`}
          >
            {mid.date.getDate()}
          </div>,
        );
      }
      i = j;
      continue;
    }

    let bg = "var(--bg-sage-25)";
    if (isFinish)
      bg = "linear-gradient(135deg, var(--terra), rgba(201,123,90,0.85))";
    else if (count >= 3) bg = "var(--bg-sage-50)";
    const color = isFinish ? "white" : "var(--plum)";
    const isStartOfMonth = date.getDate() === 1;
    const monthLabel = isStartOfMonth
      ? date.toLocaleDateString("en-US", { month: "short" })
      : null;

    chips.push(
      <div
        key={dateStr}
        title={`${date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}${count ? ` · ${count} note${count !== 1 ? "s" : ""}` : ""}`}
        className="timeline-day"
        style={{ background: bg, color }}
      >
        {monthLabel && <span className="timeline-day-pages">{monthLabel}</span>}
        <span className="timeline-day-num">{date.getDate()}</span>
        {isFinish && (
          <span className="timeline-day-pages text-white/90">
            {pages > 0 ? `${pages}p ✓` : "✓"}
          </span>
        )}
      </div>,
    );
    i++;
  }

  return (
    <div className="mb-7">
      <p className="font-hand text-note text-ink-light mb-2.5">
        days you spent with this book
      </p>
      <div className="flex gap-[5px] flex-wrap items-center">{chips}</div>
      <div className="flex gap-4 mt-2.5 flex-wrap">
        {LEGEND.map(({ bg, label }) => (
          <span
            key={label}
            className="flex items-center gap-[5px] text-detail text-ink-light font-sans"
          >
            <span
              className="w-2.5 h-2.5 rounded-[2px] inline-block"
              style={{ background: bg }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
