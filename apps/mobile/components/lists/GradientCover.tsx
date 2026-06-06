import { useId, useState } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { coverGradient } from "./coverMeta";

/**
 * Fills its parent with a 135° gradient matching the web list covers.
 *
 * We measure the laid-out box and hand the <Svg> numeric pixel dimensions
 * instead of "100%": react-native-svg doesn't reliably resolve percentage
 * sizing against an absolutely-filled parent (it renders a too-narrow
 * canvas), which left a bare strip on the right of each cover.
 */
export function GradientCover({
  color,
  style,
  children,
}: {
  color: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [from, to] = coverGradient(color);
  // Unique per instance so gradient ids never collide across covers.
  const id = `cover${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  return (
    <View style={style} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
          <Defs>
            <LinearGradient
              id={id}
              x1="0"
              y1="0"
              x2={size.w}
              y2={size.h}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={size.w}
            height={size.h}
            fill={`url(#${id})`}
          />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
