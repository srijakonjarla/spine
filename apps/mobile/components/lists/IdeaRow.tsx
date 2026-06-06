import { Pressable, StyleSheet, Text } from "react-native";
import type { ListItem } from "@spine/shared";
import { CheckIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";
import { rowStyles } from "./rowStyles";

/**
 * Row for idea / bullet / checklist lists. Long-press to remove, plus a
 * trailing × tap target. Checklist rows toggle via the leading checkbox.
 */
export function IdeaRow({
  item,
  isChecklist,
  bullet,
  onToggle,
  onRemove,
}: {
  item: ListItem;
  isChecklist: boolean;
  bullet: string;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const done = item.type === "done";
  return (
    <Pressable onLongPress={onRemove} style={styles.row}>
      {isChecklist ? (
        <Pressable onPress={onToggle} hitSlop={8} style={styles.checkbox}>
          {done ? <CheckIcon size={14} color={C.terraInk} /> : null}
        </Pressable>
      ) : (
        <Text style={styles.bullet}>{bullet}</Text>
      )}
      <Text style={[styles.text, done && styles.textDone]}>{item.title}</Text>
      <Pressable onPress={onRemove} hitSlop={8} style={rowStyles.removeBtn}>
        <Text style={rowStyles.removeX}>×</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,27,46,0.06)",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  bullet: { fontSize: 15, color: C.terra, width: 18, textAlign: "center" },
  text: { flex: 1, fontSize: 15, color: C.fgMid, lineHeight: 21 },
  textDone: { color: C.fgFaint, textDecorationLine: "line-through" },
});
