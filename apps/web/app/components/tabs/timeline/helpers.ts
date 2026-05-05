// Shared helpers for TimelineTab sub-components.

import {
  CloudSunIcon,
  Icon,
  MoonStarsIcon,
  SunHorizonIcon,
  SunIcon,
} from "@phosphor-icons/react";

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
export function timeOfDayEmoji(iso: string): Icon {
  const label = timeOfDayLabel(iso);
  if (label === "morning") return SunIcon;
  if (label === "afternoon") return CloudSunIcon;
  if (label === "evening") return SunHorizonIcon;
  return MoonStarsIcon;
}
