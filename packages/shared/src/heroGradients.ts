/**
 * Per-book hero gradients. Web renders these as CSS classes (see
 * apps/web/app/styles/hero-gradients.css); mobile renders them via
 * react-native-svg. Both call `heroGradientIndex(title)` with the same
 * hash function so a book lands on the same palette on every surface.
 */

export type HeroGradient = readonly [string, string, string];

export const HERO_GRADIENTS: readonly HeroGradient[] = [
  ["#3a1f3d", "#4a2b5a", "#5a3268"], // plum
  ["#5b2f0f", "#8e4a1a", "#6b3a1a"], // amber
  ["#1a2f5c", "#2a4d8f", "#1e3a7a"], // navy
  ["#0f2218", "#1e3a2e", "#2a5240"], // forest
  ["#8e4a2e", "#c97b5a", "#a05c42"], // terra
  ["#4a2862", "#7b4a8d", "#5a3270"], // purple
  ["#1c2040", "#2d3561", "#1e2a50"], // indigo
  ["#5c1a1a", "#8e2c2c", "#6a2020"], // crimson
  ["#8a6b20", "#b48930", "#8a6818"], // gold
  ["#3a2018", "#5b3a2e", "#4a2e22"], // umber
] as const;

export function heroGradientIndex(title: string): number {
  let h = 0;
  const s = title || " ";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % HERO_GRADIENTS.length;
}

export function heroGradientFor(title: string): HeroGradient {
  return HERO_GRADIENTS[heroGradientIndex(title)];
}
