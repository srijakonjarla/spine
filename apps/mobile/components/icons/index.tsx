// Minimal Phosphor-style line icons. Stroke 1.5 to match the design system.
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

type IconProps = {
  size?: number;
  color: string;
  weight?: "regular" | "bold";
};

const stroke = (color: string, w = 1.5) =>
  ({
    stroke: color,
    strokeWidth: w,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  }) as const;

export function ClockIcon({ size = 22, color, weight = "regular" }: IconProps) {
  const w = weight === "bold" ? 2 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, w)}>
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 15 14" />
    </Svg>
  );
}

export function BookIcon({ size = 22, color, weight = "regular" }: IconProps) {
  const w = weight === "bold" ? 2 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, w)}>
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

export function CalendarIcon({
  size = 22,
  color,
  weight = "regular",
}: IconProps) {
  const w = weight === "bold" ? 2 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, w)}>
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

export function ListIcon({ size = 22, color, weight = "regular" }: IconProps) {
  const w = weight === "bold" ? 2 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, w)}>
      <Line x1="8" y1="6" x2="21" y2="6" />
      <Line x1="8" y1="12" x2="21" y2="12" />
      <Line x1="8" y1="18" x2="21" y2="18" />
      <Line x1="3" y1="6" x2="3.01" y2="6" />
      <Line x1="3" y1="12" x2="3.01" y2="12" />
      <Line x1="3" y1="18" x2="3.01" y2="18" />
    </Svg>
  );
}

export function PersonIcon({
  size = 22,
  color,
  weight = "regular",
}: IconProps) {
  const w = weight === "bold" ? 2 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, w)}>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function TargetIcon({
  size = 22,
  color,
  weight = "regular",
}: IconProps) {
  const w = weight === "bold" ? 2 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, w)}>
      <Circle cx="12" cy="12" r="10" />
      <Circle cx="12" cy="12" r="6" />
      <Circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 1.6)}>
      <Circle cx="11" cy="11" r="7" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

export function PlusIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 1.8)}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 2)}>
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

export function QuoteIcon({ size = 16, color }: IconProps) {
  // Two opening quote marks
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M7 7h3v3a4 4 0 0 1-4 4v-2a2 2 0 0 0 2-2H7V7zm7 0h3v3a4 4 0 0 1-4 4v-2a2 2 0 0 0 2-2h-1V7z" />
    </Svg>
  );
}

export function LeafIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 1.5)}>
      <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <Path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </Svg>
  );
}

export function BookOpenIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 1.5)}>
      <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

export function MoonIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 1.5)}>
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}

export function SunIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, 1.5)}>
      <Circle cx="12" cy="12" r="4" />
      <Line x1="12" y1="2" x2="12" y2="4" />
      <Line x1="12" y1="20" x2="12" y2="22" />
      <Line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <Line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <Line x1="2" y1="12" x2="4" y2="12" />
      <Line x1="20" y1="12" x2="22" y2="12" />
      <Line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <Line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </Svg>
  );
}

export function StarIcon({ size = 14, color, weight = "regular" }: IconProps) {
  const filled = weight === "bold";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookmarkIcon({
  size = 18,
  color,
  weight = "regular",
}: IconProps) {
  const filled = weight === "bold";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GridIcon({ size = 22, color, weight = "regular" }: IconProps) {
  const w = weight === "bold" ? 2 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, w)}>
      <Rect x="3" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="3" width="7" height="7" rx="1" />
      <Rect x="3" y="14" width="7" height="7" rx="1" />
      <Rect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
  );
}

export function FlameIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c.6 3-1.5 4.5-3 6.5C7.5 10.5 6 12.5 6 15a6 6 0 0 0 12 0c0-2.5-1-4.5-2.5-6 .3 1.7-.5 3-2 3-1.4 0-2-1-2-2.3 0-2 1.3-3.7 1-5.2-.2-1.2-.5-1.8-.5-2.5z" />
    </Svg>
  );
}
