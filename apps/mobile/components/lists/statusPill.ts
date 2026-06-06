import { C } from "@/components/login/tokens";

/**
 * Mobile reading-status pill presentation: short label + glyph + accent
 * color, used by the library InlineAdd suggestions and the list book rows.
 *
 * This is intentionally mobile-only — the canonical status vocabulary
 * (long labels, web glyphs) lives in `@spine/shared`'s statusMeta; these are
 * the compact pill variants the mobile UI uses.
 */
export const STATUS_PILL: Record<
  string,
  { symbol: string; label: string; color: string }
> = {
  reading: { symbol: "○", label: "reading", color: C.terraInk },
  finished: { symbol: "✓", label: "finished", color: "#5f7d68" },
  "want-to-read": { symbol: "◌", label: "tbr", color: C.plum },
  "did-not-finish": { symbol: "×", label: "dnf", color: C.fgMuted },
};
