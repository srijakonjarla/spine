import { useState } from "react";

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

const DAY_STRIP_THRESHOLD = 5;

/**
 * Horizontal strip showing every day the user has spent with a book — including
 * the days they didn't log anything. Days with notes get the sage chip style;
 * the finished day gets terra. Empty days render as the muted gap chip so the
 * full continuous span is visible. Overflow scrolls horizontally.
 */
export default function DaysStrip({
  calendarDays,
  thoughtsByDay,
  pagesByDay,
  finishedDateStr,
}: DaysStripProps) {
  const [expanded, setExpanded] = useState(false);
  if (calendarDays.length === 0) return null;

  const collapsed = calendarDays.length > DAY_STRIP_THRESHOLD && !expanded;
  const visible = collapsed
    ? [calendarDays[0], null, ...calendarDays.slice(-4)]
    : calendarDays;
  const hiddenCount = calendarDays.length - 5;

  return (
    <div className="mb-7">
      <p className="font-hand text-note text-fg-muted mb-2.5">
        days you spent with this book
      </p>
      <div
        className="flex gap-[5px] items-center overflow-x-auto pb-1 -mx-1 px-1 scroll-smooth snap-x"
        style={{ scrollbarWidth: "thin" }}
      >
        {visible.map((entry, idx) => {
          if (entry === null) {
            return (
              <button
                key="ellipsis"
                onClick={() => setExpanded(true)}
                className="timeline-day-gap shrink-0 snap-start cursor-pointer hover:border-fg-muted hover:text-fg-muted transition-colors"
                title={`Show ${hiddenCount} hidden day${hiddenCount === 1 ? "" : "s"}`}
                style={{ borderStyle: "dashed" }}
              >
                +{hiddenCount}
              </button>
            );
          }
          const { date, dateStr } = entry;
          void idx;
          const count = thoughtsByDay[dateStr] || 0;
          const pages = pagesByDay[dateStr] || 0;
          const isFinish = dateStr === finishedDateStr;
          const hasEntry = count > 0 || isFinish;
          const isStartOfMonth = date.getDate() === 1;
          const monthLabel = isStartOfMonth
            ? date.toLocaleDateString("en-US", { month: "short" })
            : null;

          if (!hasEntry) {
            return (
              <div
                key={dateStr}
                className="timeline-day-gap shrink-0 snap-start"
                title={date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              >
                {date.getDate()}
              </div>
            );
          }

          let bg = "var(--bg-sage-25)";
          if (isFinish)
            bg = "linear-gradient(135deg, var(--terra), rgba(201,123,90,0.85))";
          else if (count >= 3) bg = "var(--bg-sage-50)";
          const color = isFinish ? "white" : "var(--fg)";

          return (
            <div
              key={dateStr}
              title={`${date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}${count ? ` · ${count} note${count !== 1 ? "s" : ""}` : ""}`}
              className="timeline-day shrink-0 snap-start"
              style={{ background: bg, color }}
            >
              {monthLabel && (
                <span className="timeline-day-pages">{monthLabel}</span>
              )}
              <span className="timeline-day-num">{date.getDate()}</span>
              {isFinish && (
                <span className="timeline-day-pages text-white/90">
                  {pages > 0 ? `${pages}p ✓` : "✓"}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2.5 flex-wrap">
        {LEGEND.map(({ bg, label }) => (
          <span
            key={label}
            className="flex items-center gap-[5px] text-detail text-fg-muted font-sans"
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
