import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GridIcon, ListIcon, SearchIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";

const MOOD_COLOR: Record<string, string> = {
  cozy: "#c97b5a",
  dark: "#374151",
  hopeful: "#7b9e87",
  funny: "#d4a843",
  "slow-burn": "#c4b5d4",
  escapist: "#1565c0",
  whimsical: "#8b5cf6",
  "heart-wrenching": "#be185d",
  "thought-provoking": "#2d1b2e",
};

export function normalizeMood(mood: string): string {
  return mood.trim().toLowerCase().replace(/\s+/g, "-");
}

export function moodColor(mood: string): string {
  return MOOD_COLOR[normalizeMood(mood)] ?? "#8a7a6a";
}

export function ViewToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: "grid" | "list";
  setViewMode: (m: "grid" | "list") => void;
}) {
  return (
    <View style={s.viewToggle}>
      <Pressable
        hitSlop={6}
        onPress={() => setViewMode("grid")}
        style={[s.viewBtn, viewMode === "grid" && s.viewBtnActive]}
      >
        <GridIcon size={16} color={viewMode === "grid" ? C.plum : C.fgFaint} />
      </Pressable>
      <Pressable
        hitSlop={6}
        onPress={() => setViewMode("list")}
        style={[s.viewBtn, viewMode === "list" && s.viewBtnActive]}
      >
        <ListIcon size={16} color={viewMode === "list" ? C.plum : C.fgFaint} />
      </Pressable>
    </View>
  );
}

export function SearchBar({
  search,
  setSearch,
  hasMoods,
  tagsOpen,
  setTagsOpen,
}: {
  search: string;
  setSearch: (v: string) => void;
  hasMoods: boolean;
  tagsOpen: boolean;
  setTagsOpen: (fn: (v: boolean) => boolean) => void;
}) {
  return (
    <View style={s.searchRow}>
      <SearchIcon size={16} color={C.fgFaint} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="search by title or author…"
        placeholderTextColor={C.fgFaint}
        autoCapitalize="none"
        autoCorrect={false}
        style={s.searchInput}
        returnKeyType="search"
      />
      {search.length > 0 ? (
        <Pressable hitSlop={8} onPress={() => setSearch("")}>
          <Text style={s.searchClear}>×</Text>
        </Pressable>
      ) : hasMoods ? (
        <Pressable hitSlop={8} onPress={() => setTagsOpen((v) => !v)}>
          <Text style={s.tagsToggle}>tags {tagsOpen ? "▾" : "▸"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MoodChipRow({
  moods,
  activeMood,
  setActiveMood,
}: {
  moods: string[];
  activeMood: string | null;
  setActiveMood: (m: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chipRowContent}
      style={s.chipRow}
    >
      <Pressable
        onPress={() => setActiveMood(null)}
        style={[s.chip, s.chipAll, activeMood === null && s.chipAllActive]}
      >
        <Text
          style={[
            s.chipText,
            activeMood === null ? s.chipAllActiveText : { color: C.fgMuted },
          ]}
        >
          all
        </Text>
      </Pressable>
      {moods.map((mood) => {
        const active = activeMood === mood;
        const color = moodColor(mood);
        return (
          <Pressable
            key={mood}
            onPress={() => setActiveMood(active ? null : mood)}
            style={[s.chip, { backgroundColor: active ? color : C.paperDeep }]}
          >
            <Text style={[s.chipText, { color: active ? C.cream : color }]}>
              {mood}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.paperDeep,
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  viewBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  viewBtnActive: { backgroundColor: C.cream },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.fg, padding: 0 },
  searchClear: {
    fontSize: 18,
    color: C.fgFaint,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  tagsToggle: { fontSize: 12, color: C.fgFaint, letterSpacing: 0.3 },

  chipRow: { marginBottom: 18 },
  chipRowContent: { gap: 8, paddingVertical: 2, paddingRight: 24 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.paperDeep,
  },
  chipAll: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipAllActive: { backgroundColor: C.plum, borderColor: C.plum },
  chipAllActiveText: { color: C.cream },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
