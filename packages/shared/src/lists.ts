/**
 * Shared list-domain vocabulary used by both the web and mobile apps:
 * cover colors/gradients, list-type metadata, and the option sets for
 * idea bullets, library-loan statuses, and ledger transactions.
 *
 * This module is presentation-agnostic — it holds data (names, labels,
 * hex values, option lists) but no React components or platform styles.
 * Each app maps the icon-name strings to its own icon set.
 */

// ─── Cover colors ────────────────────────────────────────────────
export const COVER_COLORS = [
  "plum",
  "navy",
  "forest",
  "terra",
  "ruby",
  "violet",
  "gold",
  "sage",
  "lavender",
  "bark",
] as const;

export type CoverColor = (typeof COVER_COLORS)[number];

/** [from, to] for a 135° linear gradient — resolved from globals.css vars. */
export const COVER_GRADIENT: Record<CoverColor, [string, string]> = {
  plum: ["#2d1b2e", "#4a2b5a"],
  navy: ["#2d3561", "#4a5795"],
  forest: ["#1e3a2e", "#3d6f57"],
  terra: ["#c97b5a", "#e09973"],
  ruby: ["#8e2c2c", "#b54040"],
  violet: ["#7b4a8d", "#a86bc2"],
  gold: ["#d4a843", "#e8c468"],
  sage: ["#7b9e87", "#a4c0af"],
  lavender: ["#c4b5d4", "#ddd3ea"],
  bark: ["#5b3a2e", "#8a5a46"],
};

export function coverColorKey(color: string): CoverColor {
  return (COVER_COLORS as readonly string[]).includes(color)
    ? (color as CoverColor)
    : "plum";
}

export function coverGradient(color: string): [string, string] {
  return COVER_GRADIENT[coverColorKey(color)];
}

// ─── List types ──────────────────────────────────────────────────
export type ListTypeValue =
  | "book_list"
  | "idea_list"
  | "checklist"
  | "bullet_list"
  | "library_loan"
  | "book_ledger";

export interface ListTypeMeta {
  value: ListTypeValue;
  /** Human label shown on the cover chip / header. */
  label: string;
  /** Pluralized noun for the item count. */
  itemLabel: string;
  /** Icon-name key — each app resolves this to its own icon component. */
  icon: string;
}

export const LIST_TYPES: readonly ListTypeMeta[] = [
  { value: "book_list", label: "book list", itemLabel: "books", icon: "Books" },
  {
    value: "idea_list",
    label: "idea list",
    itemLabel: "ideas",
    icon: "Lightbulb",
  },
  {
    value: "checklist",
    label: "checklist",
    itemLabel: "items",
    icon: "CheckSquare",
  },
  {
    value: "bullet_list",
    label: "bullet points",
    itemLabel: "points",
    icon: "ListBullets",
  },
  {
    value: "library_loan",
    label: "library loans",
    itemLabel: "loans",
    icon: "BookOpen",
  },
  {
    value: "book_ledger",
    label: "book ledger",
    itemLabel: "entries",
    icon: "Tag",
  },
];

export function listTypeMeta(listType: string): ListTypeMeta {
  return LIST_TYPES.find((t) => t.value === listType) ?? LIST_TYPES[0];
}

/** List types that render as a free-text list rather than a book list. */
export const IDEA_TYPES: ReadonlySet<string> = new Set([
  "idea_list",
  "bullet_list",
  "checklist",
]);

// ─── Item option sets ────────────────────────────────────────────
/** Book-ledger transaction types. */
export const TX_TYPES = ["bought", "sold", "gifted", "donated"] as const;
export type TxType = (typeof TX_TYPES)[number];

/** Library-loan statuses, stored in the item's `type` field ("" = out). */
export const LOAN_STATUSES: { value: string; label: string }[] = [
  { value: "", label: "out" },
  { value: "renewed", label: "renewed" },
  { value: "returned", label: "returned" },
];

/** Bullet glyph choices for idea / bullet lists. */
export const BULLET_SYMBOLS = ["→", "●", "✦", "◆", "○", "—", "✓", "★"];
