import React from "react";
import {
  BooksIcon,
  LightbulbIcon,
  WavesIcon,
  AirplaneInFlightIcon,
  HeartIcon,
  LeafIcon,
  MoonStarsIcon,
  TreeIcon,
  TargetIcon,
  SparkleIcon,
  PenIcon,
  FlowerIcon,
  StarIcon,
  MagicWandIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { COVER_COLORS, coverColorKey, type CoverColor } from "@spine/shared";

// Color names + key resolution are shared with mobile; web keeps its own
// Phosphor icon map and CSS-variable gradient implementation below.
export { COVER_COLORS, type CoverColor };

export const COVER_ICONS: Record<string, Icon> = {
  Books: BooksIcon,
  Lightbulb: LightbulbIcon,
  Waves: WavesIcon,
  Airplane: AirplaneInFlightIcon,
  Heart: HeartIcon,
  Leaf: LeafIcon,
  Moon: MoonStarsIcon,
  Tree: TreeIcon,
  Target: TargetIcon,
  Sparkle: SparkleIcon,
  Pen: PenIcon,
  Flower: FlowerIcon,
  Star: StarIcon,
  MagicWand: MagicWandIcon,
};

export const COVER_ICON_NAMES = Object.keys(COVER_ICONS);

const COVER_GRADIENT: Record<CoverColor, string> = {
  plum: "linear-gradient(135deg, var(--cover-plum-from), var(--cover-plum-to))",
  navy: "linear-gradient(135deg, var(--cover-navy-from), var(--cover-navy-to))",
  forest:
    "linear-gradient(135deg, var(--cover-forest-from), var(--cover-forest-to))",
  terra:
    "linear-gradient(135deg, var(--cover-terra-from), var(--cover-terra-to))",
  ruby: "linear-gradient(135deg, var(--cover-ruby-from), var(--cover-ruby-to))",
  violet:
    "linear-gradient(135deg, var(--cover-violet-from), var(--cover-violet-to))",
  gold: "linear-gradient(135deg, var(--cover-gold-from), var(--cover-gold-to))",
  sage: "linear-gradient(135deg, var(--cover-sage-from), var(--cover-sage-to))",
  lavender:
    "linear-gradient(135deg, var(--cover-lavender-from), var(--cover-lavender-to))",
  bark: "linear-gradient(135deg, var(--cover-bark-from), var(--cover-bark-to))",
};

export function coverGradientStyle(color: string): React.CSSProperties {
  return { backgroundImage: COVER_GRADIENT[coverColorKey(color)] };
}
