import { StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { C } from "./tokens";

export function CoverGradient() {
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient
          id="coverGrad"
          cx="30%"
          cy="20%"
          r="85%"
          fx="30%"
          fy="20%"
        >
          <Stop offset="0" stopColor={C.plumGlow} stopOpacity="1" />
          <Stop offset="0.6" stopColor={C.plumDark} stopOpacity="1" />
          <Stop offset="1" stopColor={C.plumDeep} stopOpacity="1" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#coverGrad)" />
    </Svg>
  );
}
