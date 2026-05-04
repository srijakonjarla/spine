import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { styles } from "./styles";

export function FoldShadow() {
  return (
    <Svg
      pointerEvents="none"
      style={styles.foldShadow}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="fold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#fold)" />
    </Svg>
  );
}
