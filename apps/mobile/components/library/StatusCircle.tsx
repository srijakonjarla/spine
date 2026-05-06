import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export type StatusVariant = "ring" | "dashed" | "filled";

export function StatusCircle({
  variant,
  color,
  size = 12,
}: {
  variant: StatusVariant;
  color: string;
  size?: number;
}) {
  if (variant === "filled") {
    const dot = Math.max(4, Math.round(size * 0.55));
    return (
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: color,
        }}
      />
    );
  }
  // SVG so the dashed ring stays even at small sizes — RN's
  // borderStyle:"dashed" renders inconsistently below ~16px.
  const r = size / 2 - 0.75;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={1.25}
        fill="none"
        strokeDasharray={variant === "dashed" ? "1.5 1.5" : undefined}
      />
    </Svg>
  );
}
