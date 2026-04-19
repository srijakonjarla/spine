import type { TimeSlot } from "./helpers";

interface TimeOfDayProps {
  timeOfDay: Record<TimeSlot, number>;
  dominantSlot: TimeSlot | null;
}

const SLOTS: { key: TimeSlot; color: string }[] = [
  { key: "morning", color: "var(--gold)" },
  { key: "afternoon", color: "var(--sage)" },
  { key: "evening", color: "var(--terra)" },
  { key: "night", color: "var(--lavender)" },
];

/** Four-bucket reading time-of-day chart with a "mostly X" caption. */
export default function TimeOfDay({ timeOfDay, dominantSlot }: TimeOfDayProps) {
  const max = Math.max(
    timeOfDay.morning,
    timeOfDay.afternoon,
    timeOfDay.evening,
    timeOfDay.night,
    1,
  );

  return (
    <>
      <p className="timeline-section-label mb-2.5">Reading time of day</p>
      <div className="book-surface p-3 mb-6">
        <div className="flex items-end gap-2 h-12">
          {SLOTS.map(({ key, color }) => {
            const count = timeOfDay[key];
            const pct = count > 0 ? Math.max(count / max, 0.2) : 0;
            return (
              <div
                key={key}
                title={`${key} — ${count} session${count !== 1 ? "s" : ""}`}
                className="flex-1 rounded-[3px] transition-all duration-300"
                style={{
                  height: `${pct * 100}%`,
                  background: color,
                  opacity: count === 0 ? 0.15 : 1,
                  minHeight: count > 0 ? 4 : 3,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-label text-ink-light font-sans tracking-wider">
          <span>6AM</span>
          <span>12PM</span>
          <span>6PM</span>
          <span>12AM</span>
        </div>
        {dominantSlot && (
          <p className="font-hand text-note text-terra mt-2.5">
            mostly {dominantSlot}s ✦
          </p>
        )}
      </div>
    </>
  );
}
