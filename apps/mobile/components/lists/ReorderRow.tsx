import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ListItem } from "@spine/shared";
import { C } from "@/components/login/tokens";

/**
 * Compact row shown in a list's reorder mode — title plus up / down
 * arrows. Stands in for web's drag handles.
 */
export function ReorderRow({
  item,
  isFirst,
  isLast,
  onMove,
}: {
  item: ListItem;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: -1 | 1) => void;
}) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.author ? (
          <Text style={s.author} numberOfLines={1}>
            {item.author}
          </Text>
        ) : null}
      </View>
      <ArrowBtn
        label="↑"
        a11y="move up"
        disabled={isFirst}
        onPress={() => onMove(-1)}
      />
      <ArrowBtn
        label="↓"
        a11y="move down"
        disabled={isLast}
        onPress={() => onMove(1)}
      />
    </View>
  );
}

function ArrowBtn({
  label,
  a11y,
  disabled,
  onPress,
}: {
  label: string;
  a11y: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityLabel={a11y}
      style={({ pressed }) => [
        s.arrow,
        disabled && { opacity: 0.25 },
        pressed && { backgroundColor: C.paperDeep },
      ]}
    >
      <Text style={s.arrowText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,27,46,0.06)",
  },
  title: { fontSize: 15, color: C.fgMid },
  author: { fontSize: 12, color: C.fgMuted, marginTop: 2 },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.paper,
  },
  arrowText: { fontSize: 16, color: C.fg },
});
