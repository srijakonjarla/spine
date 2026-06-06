// Mobile barrel for the shared list-domain vocabulary. The data lives in
// `@spine/shared` (cross-platform); this file re-exports it so mobile
// components have one import surface, and adds the mobile-only icon subset.
export {
  COVER_COLORS,
  COVER_GRADIENT,
  coverColorKey,
  coverGradient,
  LIST_TYPES,
  listTypeMeta,
  IDEA_TYPES,
  TX_TYPES,
  LOAN_STATUSES,
  BULLET_SYMBOLS,
  type CoverColor,
  type ListTypeValue,
  type ListTypeMeta,
  type TxType,
} from "@spine/shared";

// Cover icons offered in the create/settings sheets — a subset of the web
// COVER_ICONS keys that mobile's ListGlyph knows how to render.
export const COVER_ICON_CHOICES = [
  "Books",
  "Lightbulb",
  "Heart",
  "Star",
  "Leaf",
  "Moon",
  "Sparkle",
  "Target",
] as const;
