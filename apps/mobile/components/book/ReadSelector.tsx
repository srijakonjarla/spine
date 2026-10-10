import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { BookRead } from "@spine/shared";
import { C } from "@/components/login/tokens";

/**
 * Pill strip for switching the book page between past reads and the
 * current one (same as web's ReadSelector). Hidden until there's a re-read.
 */
export function ReadSelector({
  reads,
  selectedReadId,
  onSelect,
}: {
  reads: BookRead[];
  selectedReadId: string | null;
  onSelect: (readId: string | null) => void;
}) {
  if (reads.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.strip}
      contentContainerStyle={s.content}
    >
      <Text style={s.label}>READ</Text>
      {reads.map((read, i) => {
        const date = read.dateFinished || read.dateStarted;
        return (
          <Pill
            key={read.id}
            active={selectedReadId === read.id}
            onPress={() => onSelect(read.id)}
            label={`${i + 1}${date ? ` · ${date.slice(0, 4)}` : ""}`}
          />
        );
      })}
      <Pill
        active={selectedReadId === null}
        onPress={() => onSelect(null)}
        label="current"
      />
    </ScrollView>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      hitSlop={4}
      onPress={onPress}
      style={[s.pill, active && s.pillActive]}
    >
      <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  strip: {
    flexGrow: 0,
    backgroundColor: "rgba(45,27,46,0.03)",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    color: C.fgMuted,
    letterSpacing: 1.4,
    marginRight: 2,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  pillActive: { backgroundColor: C.plum, borderColor: C.plum },
  pillText: { fontSize: 12, color: C.fgMuted },
  pillTextActive: { color: C.cream, fontWeight: "600" },
});
