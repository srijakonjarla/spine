import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "@/components/login/tokens";

export type TabId = "reflection" | "timeline" | "quotes" | "details";

const TABS: { id: TabId; label: string }[] = [
  { id: "reflection", label: "Reflection" },
  { id: "timeline", label: "Timeline" },
  { id: "quotes", label: "Quotes" },
  { id: "details", label: "Details" },
];

export function TabStrip({
  tab,
  setTab,
}: {
  tab: TabId;
  setTab: (t: TabId) => void;
}) {
  return (
    <View style={s.tabStrip}>
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <Pressable
            key={t.id}
            hitSlop={6}
            onPress={() => setTab(t.id)}
            style={s.tabBtn}
          >
            <Text style={[s.tabText, active && s.tabTextActive]}>
              {t.label}
            </Text>
            {active ? <View style={s.tabUnderline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  tabStrip: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tabBtn: { paddingVertical: 14, alignItems: "center" },
  tabText: { fontSize: 13, color: C.fgMuted, letterSpacing: 0.2 },
  tabTextActive: { color: C.fg, fontWeight: "600" },
  tabUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: C.terraInk,
  },
});
