import Svg, { Circle, Rect, Text as SvgText } from "react-native-svg";

type Variant = "dark" | "light";

interface SpineLogoProps {
  size?: number;
  variant?: Variant;
}

/**
 * Spine "s." logo mark — mirrors the web favicon SVGs.
 * - dark: plum background, cream letter, gold dot (favicon.svg)
 * - light: cream background, plum letter, gold dot (favicon-light.svg)
 */
export function SpineLogo({ size = 64, variant = "dark" }: SpineLogoProps) {
  const bg = variant === "dark" ? "#1c0e1e" : "#faf6f0";
  const fg = variant === "dark" ? "#faf6f0" : "#2d1b2e";

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx="12" fill={bg} />
      <SvgText
        x="32"
        y="44"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="700"
        fontSize="44"
        fill={fg}
        letterSpacing={-2}
      >
        s
      </SvgText>
      <Circle cx="47" cy="44" r="4.5" fill="#d4a843" />
    </Svg>
  );
}
