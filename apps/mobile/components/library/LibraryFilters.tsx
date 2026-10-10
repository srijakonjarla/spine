import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  activeFilterCount,
  LIBRARY_SORT_OPTIONS,
  normalizeMood,
  RATING_FILTER_OPTIONS,
  type LibraryFilterOptions,
  type LibraryFilterState,
  type LibrarySort,
} from "@spine/shared";
import { GridIcon, ListIcon, SearchIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";

export { normalizeMood };

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
  filterCount,
  filtersOpen,
  setFiltersOpen,
}: {
  search: string;
  setSearch: (v: string) => void;
  filterCount: number;
  filtersOpen: boolean;
  setFiltersOpen: (fn: (v: boolean) => boolean) => void;
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
      ) : null}
      <Pressable
        hitSlop={8}
        onPress={() => setFiltersOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: filtersOpen }}
      >
        <Text style={[s.tagsToggle, filterCount > 0 && s.tagsToggleActive]}>
          filters{filterCount > 0 ? ` · ${filterCount}` : ""}{" "}
          {filtersOpen ? "▾" : "▸"}
        </Text>
      </Pressable>
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

function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
  allowNone = true,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  allowNone?: boolean;
}) {
  if (options.length === 0) return null;
  return (
    <View style={s.optionRow}>
      <Text style={s.optionLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRowContent}
        style={s.chipRow}
      >
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(active && allowNone ? null : o.value)}
              style={[s.chip, s.chipAll, active && s.chipAllActive]}
            >
              <Text
                style={[
                  s.chipText,
                  active ? s.chipAllActiveText : { color: C.fgMuted },
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const asOptions = <T extends string | number>(vs: T[]) =>
  vs.map((v) => ({ value: v, label: String(v) }));

/** Expandable sort + filter panel shown under the search bar. */
export function FilterPanel({
  filters,
  setFilters,
  sort,
  setSort,
  options,
}: {
  filters: LibraryFilterState;
  setFilters: (f: LibraryFilterState) => void;
  sort: LibrarySort;
  setSort: (s: LibrarySort) => void;
  options: LibraryFilterOptions;
}) {
  const set = <K extends keyof LibraryFilterState>(
    key: K,
    value: LibraryFilterState[K],
  ) => setFilters({ ...filters, [key]: value });
  const hasFilters = activeFilterCount(filters) > 0 || !!filters.mood;

  return (
    <View style={s.panel}>
      <OptionRow
        label="sort"
        options={LIBRARY_SORT_OPTIONS}
        value={sort}
        onChange={(v) => v && setSort(v)}
        allowNone={false}
      />
      {options.moods.length > 0 ? (
        <View style={s.optionRow}>
          <Text style={s.optionLabel}>mood</Text>
          <MoodChipRow
            moods={options.moods}
            activeMood={filters.mood}
            setActiveMood={(m) => set("mood", m)}
          />
        </View>
      ) : null}
      <OptionRow
        label="rating"
        options={RATING_FILTER_OPTIONS}
        value={filters.rating}
        onChange={(v) => set("rating", v)}
      />
      <OptionRow
        label="genre"
        options={asOptions(options.genres)}
        value={filters.genre}
        onChange={(v) => set("genre", v)}
      />
      <OptionRow
        label="format"
        options={asOptions(options.formats)}
        value={filters.format}
        onChange={(v) => set("format", v)}
      />
      <OptionRow
        label="year finished"
        options={asOptions(options.years)}
        value={filters.year}
        onChange={(v) => set("year", v)}
      />
      <OptionRow
        label="bookshelf"
        options={asOptions(options.bookshelves)}
        value={filters.bookshelf}
        onChange={(v) => set("bookshelf", v)}
      />
      {hasFilters ? (
        <Pressable
          hitSlop={8}
          onPress={() => setFilters({ ...filters, ...CLEARED })}
          style={s.clearBtn}
        >
          <Text style={s.clearText}>clear filters</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const CLEARED: Partial<LibraryFilterState> = {
  mood: null,
  genre: null,
  rating: null,
  format: null,
  year: null,
  bookshelf: null,
};

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
  tagsToggleActive: { color: C.terra, fontWeight: "600" },

  panel: { marginBottom: 18, gap: 12 },
  optionRow: { gap: 6 },
  optionLabel: {
    fontSize: 10,
    color: C.fgFaint,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  clearBtn: { alignSelf: "flex-start" },
  clearText: { fontSize: 12, color: C.terra },

  chipRow: { flexGrow: 0 },
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
