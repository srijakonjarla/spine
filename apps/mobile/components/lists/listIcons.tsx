// Line icons for list covers and type chips. Stroke 1.5 to match the
// design system (see components/icons/index.tsx). Names mirror the web
// COVER_ICONS / list-type icon keys so stored `emoji` values resolve.
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

type GlyphProps = { size?: number; color: string };

const base = (color: string, w = 1.5) =>
  ({
    stroke: color,
    strokeWidth: w,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  }) as const;

function Books({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

function Lightbulb({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M9 18h6" />
      <Path d="M10 21h4" />
      <Path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </Svg>
  );
}

function CheckSquare({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Polyline points="8 12 11 15 16 9" />
    </Svg>
  );
}

function ListBullets({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Line x1="9" y1="6" x2="20" y2="6" />
      <Line x1="9" y1="12" x2="20" y2="12" />
      <Line x1="9" y1="18" x2="20" y2="18" />
      <Circle cx="4.5" cy="6" r="1.2" fill={color} stroke="none" />
      <Circle cx="4.5" cy="12" r="1.2" fill={color} stroke="none" />
      <Circle cx="4.5" cy="18" r="1.2" fill={color} stroke="none" />
    </Svg>
  );
}

function BookOpen({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

function Tag({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82z" />
      <Line x1="7" y1="7" x2="7.01" y2="7" />
    </Svg>
  );
}

function Heart({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </Svg>
  );
}

function Star({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

function Leaf({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <Path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </Svg>
  );
}

function Moon({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}

function Sparkle({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M12 3c.4 4.2 1.8 5.6 6 6-4.2.4-5.6 1.8-6 6-.4-4.2-1.8-5.6-6-6 4.2-.4 5.6-1.8 6-6z" />
    </Svg>
  );
}

function Target({ size = 18, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="5" />
      <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
    </Svg>
  );
}

const GLYPHS: Record<string, (p: GlyphProps) => React.JSX.Element> = {
  Books,
  Lightbulb,
  CheckSquare,
  ListBullets,
  BookOpen,
  Tag,
  Heart,
  Star,
  Leaf,
  Moon,
  Sparkle,
  Target,
};

/** Resolve an icon by name (cover emoji or list-type icon key). */
export function ListGlyph({
  name,
  size = 18,
  color,
}: {
  name: string;
  size?: number;
  color: string;
}) {
  const Glyph = GLYPHS[name] ?? Books;
  return <Glyph size={size} color={color} />;
}
