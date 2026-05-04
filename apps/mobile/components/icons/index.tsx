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

export function CalendarIcon({ size = 22, color, weight = "regular" }: IconProps) {
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

export function PersonIcon({ size = 22, color, weight = "regular" }: IconProps) {
  const w = weight === "bold" ? 2 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, w)}>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function TargetIcon({ size = 22, color, weight = "regular" }: IconProps) {
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

export function FlameIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13.5 1.5s2 4 0 6-4 1.5-4 5 2.5 4.5 2.5 4.5S6 16 6 12c0-3 1.5-4 1.5-4S5 6 6.5 3 13.5 1.5 13.5 1.5zm.5 14s4-1 4-5c0 0 2 2 2 5a6 6 0 1 1-12 0c0-1.5.5-2.5.5-2.5s1 2 3 2 2-2 2-2 .5 2.5.5 2.5z" />
    </Svg>
  );
}
