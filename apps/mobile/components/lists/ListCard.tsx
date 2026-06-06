import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BookList } from "@spine/shared";
import { C } from "@/components/login/tokens";
import { GradientCover } from "./GradientCover";
import { ListGlyph } from "./listIcons";
import { IDEA_TYPES, listTypeMeta } from "./coverMeta";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export function ListCard({
  list,
  onPress,
}: {
  list: BookList;
  onPress: () => void;
}) {
  const meta = listTypeMeta(list.listType);
  const isIdea = IDEA_TYPES.has(list.listType);
  const bullet = list.bulletSymbol || "→";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <GradientCover color={list.color} style={styles.cover}>
        <View style={styles.chip}>
          <ListGlyph
            name={meta.icon}
            size={10}
            color="rgba(255,255,255,0.85)"
          />
          <Text style={styles.chipText}>{meta.label}</Text>
        </View>
        <ListGlyph name={list.emoji} size={26} color="rgba(255,255,255,0.92)" />
      </GradientCover>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {list.title || "untitled"}
        </Text>
        <Text style={styles.count}>
          {list.items.length} {meta.itemLabel}
        </Text>
        <View style={styles.preview}>
          {list.items.slice(0, 3).map((item) => (
            <Text key={item.id} style={styles.previewLine} numberOfLines={1}>
              {isIdea ? <Text style={styles.bullet}>{bullet} </Text> : null}
              {item.title}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(45,27,46,0.08)",
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.85 },
  cover: {
    height: 96,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    justifyContent: "space-between",
    alignItems: "flex-start",
    overflow: "hidden",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14 },
  title: {
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  count: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 12,
    color: C.terraInk,
    marginTop: 2,
    marginBottom: 8,
  },
  preview: { gap: 2 },
  previewLine: { fontSize: 11, color: C.fgMuted, lineHeight: 15 },
  bullet: { color: C.terra },
});
