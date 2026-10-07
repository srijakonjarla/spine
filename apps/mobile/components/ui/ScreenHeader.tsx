import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { C, SERIF } from "@/components/login/tokens";

/** Back link row shown above stacked (non-tab) screens. */
export function BackBar({ label }: { label: string }) {
  const router = useRouter();
  return (
    <View style={s.topBar}>
      <Pressable
        hitSlop={8}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      >
        <Text style={s.back}>← {label}</Text>
      </Pressable>
    </View>
  );
}

/** Eyebrow + serif title + optional subtitle, with an optional right slot. */
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionLabel({
  children,
  count,
}: {
  children: string;
  count?: number;
}) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionLabel}>{children}</Text>
      <View style={s.leader} />
      {count != null ? <Text style={s.sectionCount}>{count}</Text> : null}
    </View>
  );
}

export function EmptyHint({ children }: { children: string }) {
  return <Text style={s.empty}>{children}</Text>;
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.cream,
  },
  back: { fontSize: 13, color: C.fgMuted },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 4,
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.fgFaint,
    marginBottom: 6,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 30,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1,
  },
  subtitle: { fontSize: 12, color: C.fgMuted, marginTop: 6 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.fgMuted,
  },
  leader: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: "dotted",
    borderBottomColor: C.line,
  },
  sectionCount: { fontSize: 11, color: C.fgFaint },
  empty: { fontSize: 12, color: C.fgFaint, paddingVertical: 16 },
});
