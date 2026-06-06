import { Pressable, StyleSheet, View } from "react-native";
import { C } from "@/components/login/tokens";
import { GradientCover } from "./GradientCover";
import { ListGlyph } from "./listIcons";
import { COVER_COLORS, COVER_ICON_CHOICES } from "./coverMeta";

/** Circular gradient swatches with a ring on the selected color. */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <View style={styles.row}>
      {COVER_COLORS.map((c) => {
        const active = value === c;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[styles.ring, active && styles.ringActive]}
          >
            <GradientCover color={c} style={styles.swatch} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <View style={styles.row}>
      {COVER_ICON_CHOICES.map((ic) => {
        const active = value === ic;
        return (
          <Pressable
            key={ic}
            onPress={() => onChange(ic)}
            style={[styles.iconBtn, active && styles.iconBtnActive]}
          >
            <ListGlyph name={ic} size={18} color={active ? C.cream : C.fgMid} />
          </Pressable>
        );
      })}
    </View>
  );
}

const SWATCH = 34;

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  ring: {
    width: SWATCH + 8,
    height: SWATCH + 8,
    borderRadius: (SWATCH + 8) / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  ringActive: { borderColor: C.terraInk },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    overflow: "hidden",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
  iconBtnActive: { backgroundColor: C.plum, borderColor: C.plum },
});
