import {
  BooksIcon, LightbulbIcon, WavesIcon, AirplaneInFlightIcon,
  HeartIcon, LeafIcon, MoonStarsIcon, TreeIcon, TargetIcon,
  SparkleIcon, PenIcon, FlowerIcon, StarIcon, MagicWandIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export const COVER_COLORS = [
  "plum", "navy", "forest", "terra", "ruby", "violet", "gold", "sage", "lavender", "bark",
] as const;

export type CoverColor = (typeof COVER_COLORS)[number];

export const COVER_HEX: Record<string, string> = {
  plum: "#2D1B2E", navy: "#2D3561", forest: "#1E3A2E", terra: "#C97B5A",
  ruby: "#8E2C2C", violet: "#7B4A8D", gold: "#D4A843", sage: "#7B9E87",
  lavender: "#C4B5D4", bark: "#5B3A2E",
};

export const COVER_ICONS: Record<string, Icon> = {
  Books: BooksIcon, Lightbulb: LightbulbIcon, Waves: WavesIcon,
  Airplane: AirplaneInFlightIcon, Heart: HeartIcon, Leaf: LeafIcon,
  Moon: MoonStarsIcon, Tree: TreeIcon, Target: TargetIcon,
  Sparkle: SparkleIcon, Pen: PenIcon, Flower: FlowerIcon,
  Star: StarIcon, MagicWand: MagicWandIcon,
};

export const COVER_ICON_NAMES = Object.keys(COVER_ICONS);

export function coverGradient(color: string): string {
  const hex = COVER_HEX[color] ?? "#2D1B2E";
  return `linear-gradient(135deg, var(--cover-${color}-from, ${hex}), var(--cover-${color}-to, ${hex}))`;
}
