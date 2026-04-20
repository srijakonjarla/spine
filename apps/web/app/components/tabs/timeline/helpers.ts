// Shared helpers for TimelineTab sub-components.

export type TimeSlot = "morning" | "afternoon" | "evening" | "night";

/** Bucket a timestamp into one of four time-of-day slots. */
export function timeOfDayLabel(iso: string): TimeSlot {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

/** Emoji for the time slot of a timestamp. */
export function timeOfDayEmoji(iso: string): string {
  const label = timeOfDayLabel(iso);
  if (label === "morning") return "☀️";
  if (label === "afternoon") return "🌤️";
  if (label === "evening") return "🌆";
  return "🌙";
}
