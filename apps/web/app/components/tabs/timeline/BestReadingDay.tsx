import { formatShortDate } from "@/lib/dates";

export interface BestDay {
  dateStr: string;
  /** Total pages read on that day, or null if we only have note-count data. */
  pages: number | null;
  notes: number;
  /** Representative note text from that day. */
  note: string;
}

interface BestReadingDayProps {
  bestDay: BestDay | null;
}

/** "Best reading day" sidebar block — shows pages, or note count as a fallback. */
export default function BestReadingDay({ bestDay }: BestReadingDayProps) {
  if (!bestDay) return null;
  const headline =
    bestDay.pages != null
      ? `${bestDay.pages} pages`
      : `${bestDay.notes} ${bestDay.notes === 1 ? "note" : "notes"}`;

  return (
    <>
      <p className="timeline-section-label mb-2.5">Best reading day</p>
      <div className="book-surface p-3 mb-6">
        <p className="font-serif text-[26px] font-bold text-fg-heading leading-none">
          {headline}
        </p>
        <p className="font-hand text-note text-terra mt-1.5 leading-snug">
          {formatShortDate(bestDay.dateStr)}
          {bestDay.note && (
            <>
              {" "}
              — <span>{bestDay.note}</span>
            </>
          )}
        </p>
      </div>
    </>
  );
}
