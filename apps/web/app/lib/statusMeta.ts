// Canonical status vocabulary (labels, glyphs, ordering, truncation) is
// shared with mobile via @spine/shared. The Tailwind color classes below
// are web-only presentation.
export {
  STATUS_LABEL,
  STATUS_SYMBOL,
  STATUSES,
  STATUS_ORDER,
  TRUNCATED_STATUSES,
  TRUNCATE_LIMIT,
} from "@spine/shared";

export const STATUS_COLOR: Record<string, string> = {
  reading: "text-terra",
  finished: "text-sage",
  "want-to-read": "text-[var(--fg-muted)]",
  "did-not-finish": "text-[var(--fg-faint)]",
};
