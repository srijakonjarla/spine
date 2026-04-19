import { daysApart, formatShortDate, localDateStr } from "@/lib/dates";

interface ReadingPeriodProps {
  dateStarted: string | null;
  dateFinished: string | null;
  /** True when we should render an open-ended "→ now" range. */
  isOngoing: boolean;
}

/** Sidebar block: start date → end date, with total day count. */
export default function ReadingPeriod({
  dateStarted,
  dateFinished,
  isOngoing,
}: ReadingPeriodProps) {
  if (!dateStarted) return null;
  const hasRange = !!dateFinished || isOngoing;
  const totalDays = daysApart(dateStarted, dateFinished || localDateStr()) + 1;

  return (
    <>
      <p className="timeline-section-label mb-2.5">Reading period</p>
      <div className="book-surface p-3">
        <p className="font-hand text-[15px] text-plum">
          {formatShortDate(dateStarted)}
          {hasRange && (
            <> → {dateFinished ? formatShortDate(dateFinished) : "now"}</>
          )}
        </p>
        <p className="font-serif text-[11px] tracking-[0.12em] uppercase text-ink-light mt-1.5">
          {totalDays} days
        </p>
      </div>
    </>
  );
}
