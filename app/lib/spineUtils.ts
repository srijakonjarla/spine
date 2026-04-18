/**
 * Deterministic integer hash of a string. Always returns a non-negative number.
 * Used for stable color/height assignments from titles.
 */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SPINE_COUNT = 10;

/** Returns a deterministic CSS variable color string, e.g. `var(--spine-3)`, based on the title. */
export function spineColor(title: string): string {
  return `var(--spine-${(hashStr(title || " ") % SPINE_COUNT) + 1})`;
}
