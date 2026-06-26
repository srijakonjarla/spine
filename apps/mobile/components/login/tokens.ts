import { Platform } from "react-native";

/**
 * Spine palette — mirrors web's CSS custom properties in
 * `apps/web/app/globals.css`. Keep keys + values in sync with that file
 * whenever the design system shifts so the two apps look identical.
 *
 * For alpha tints, use the `RGB` channel tuples below + `alpha()`,
 * matching web's `rgb(var(--ch-X) / a)` pattern.
 */
export const C = {
  // ─── Plum (primary dark) ─────────────────────────────────────────
  plum: "#2d1b2e",
  plumLight: "#4a2b5a",
  plumDark: "#1c0e1e",
  plumDeep: "#120810",
  plumGlow: "#3d2a3f",

  // ─── Terra (accent / warm) ───────────────────────────────────────
  terra: "#c97b5a",
  terraLight: "#e09070",
  terraInk: "#b8533a",
  terraPressed: "#a04630",

  // ─── Sage (success / streak / logged) ────────────────────────────
  sage: "#7b9e87",
  sageLight: "#a4c0af",
  sageDeep: "#5f7d68",

  // ─── Lavender (quotes / thoughts accent) ─────────────────────────
  lavender: "#c4b5d4",
  lavenderLight: "#ddd3ea",
  lavenderMuted: "#b5a9c9",

  // ─── Gold (highlights / ratings) ─────────────────────────────────
  gold: "#d4a843",
  goldLight: "#e8c468",

  // ─── Neutrals / surfaces ─────────────────────────────────────────
  cream: "#faf6f0",
  creamDark: "#f0eae0",
  paper: "#fbf8f2",
  paperDeep: "#f0e8db",
  white: "#fdfaf5",
  line: "#e4d9c5",

  // ─── Foreground (text) ───────────────────────────────────────────
  fg: "#2d1b2e",
  fgHeading: "#2d1b2e",
  fgMid: "#3d2e2e",
  fgMuted: "#8a7a6a",
  fgFaint: "#c4bfba",
  ink: "#1a1a1a",
  inkLight: "#5a5060",

  // ─── States ──────────────────────────────────────────────────────
  danger: "#c0392b",
  dangerHover: "#b91c1c",

  // ─── Year bookshelf spine swatches (matches --year-shelf-N) ──────
  yearShelf: [
    "#c96a45",
    "#2d3561",
    "#7b9e87",
    "#c4b5d4",
    "#d4a843",
    "#8e4b2e",
    "#3d6f57",
    "#6b3a4a",
    "#0f2c5c",
    "#4a2b5a",
    "#c97b5a",
    "#1e3a2e",
    "#9c5c6f",
    "#5b3a2e",
    "#7b4a8d",
    "#2a4d8f",
    "#c04848",
    "#3a2d5c",
    "#4a6741",
  ] as const,
} as const;

/**
 * RGB channel tuples — used with `alpha()` to produce translucent
 * variants of the palette colors. Mirrors web's `--ch-X` CSS vars.
 */
export const RGB = {
  plum: "45,27,46",
  ink: "90,80,96",
  sage: "123,158,135",
  terra: "201,123,90",
  gold: "212,168,67",
  lavender: "196,181,212",
  cream: "250,246,240",
} as const;

/** `alpha(RGB.sage, 0.18)` → `"rgba(123,158,135,0.18)"`. */
export function alpha(rgb: string, a: number): string {
  return `rgba(${rgb},${a})`;
}

/** Cover gradient stops — mirrors web's `--cover-*-from/to` CSS vars. */
export const COVER_GRADIENTS = {
  plum: { from: C.plum, to: C.plumLight },
  navy: { from: "#2d3561", to: "#4a5795" },
  forest: { from: "#1e3a2e", to: "#3d6f57" },
  terra: { from: C.terra, to: "#e09973" },
  ruby: { from: "#8e2c2c", to: "#b54040" },
  violet: { from: "#7b4a8d", to: "#a86bc2" },
  gold: { from: C.gold, to: C.goldLight },
  sage: { from: C.sage, to: C.sageLight },
  lavender: { from: C.lavender, to: C.lavenderLight },
  bark: { from: "#5b3a2e", to: "#8a5a46" },
} as const;

export const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export const SEAL_SIZE = 38;
