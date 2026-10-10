import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  activeFilterCount,
  EMPTY_LIBRARY_FILTERS,
  hasActiveFilters,
  libraryFilterOptions,
  matchesLibraryFilters,
  sortBooks,
  STATUS_LABEL,
  type LibraryFilterState,
  type LibrarySort,
  type ReadingStatus,
} from "@spine/shared";
import { homeStyles as h } from "@/components/home";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { BookRow } from "@/components/library/BookRow";
import { InlineAdd } from "@/components/library/InlineAdd";
import {
  FilterPanel,
  SearchBar,
  ViewToggle,
} from "@/components/library/LibraryFilters";
import { C } from "@/components/login/tokens";
import { BackBar, EmptyHint, ScreenHeader } from "@/components/ui/ScreenHeader";
import { Stars } from "@/components/ui/Stars";
import { useBooks } from "@/lib/booksContext";
import { createEntry, lookupBook, type CatalogEntry } from "@/lib/library";
import { makeEntry } from "@/lib/makeEntry";

const STATUS_ROW: Record<ReadingStatus, { symbol: string; color: string }> = {
  reading: { symbol: "○", color: C.terra },
  "want-to-read": { symbol: "◌", color: C.plum },
  finished: { symbol: "●", color: C.sage },
  "did-not-finish": { symbol: "◌", color: C.fgMuted },
};

function isStatus(s: string | undefined): s is ReadingStatus {
  return !!s && s in STATUS_ROW;
}

export default function StatusShelfScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ status: string }>();
  const status = isStatus(params.status) ? params.status : null;
  const {
    books: entries,
    loading,
    error,
    refresh,
    addBook,
    removeBook,
  } = useBooks();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<LibraryFilterState>(
    EMPTY_LIBRARY_FILTERS,
  );
  const [sort, setSort] = useState<LibrarySort>("date-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const all = useMemo(
    () => (status ? entries.filter((b) => b.status === status) : []),
    [entries, status],
  );
  const upNext = useMemo(
    () => sortBooks(all, "date-desc").filter((b) => b.upNext),
    [all],
  );
  const options = useMemo(() => libraryFilterOptions(all), [all]);
  const filtering = hasActiveFilters(filters);
  const filtered = useMemo(
    () =>
      sortBooks(
        all.filter((e) => matchesLibraryFilters(e, filters)),
        sort,
      ),
    [all, filters, sort],
  );

  const handleAdd = useCallback(
    async (catalog?: CatalogEntry, raw?: string) => {
      if (!status) return;
      const enriched =
        catalog ?? (raw ? await lookupBook(raw).catch(() => null) : null);
      const entry = makeEntry(status, enriched ?? undefined, raw);
      if (!entry) return;
      addBook(entry);
      try {
        await createEntry(entry);
        refresh();
      } catch (e) {
        removeBook(entry.id);
        Alert.alert(
          "couldn't add book",
          e instanceof Error ? e.message : "try again later.",
        );
      }
    },
    [status, addBook, removeBook, refresh],
  );

  const cols = width >= 700 ? 4 : 3;
  const gap = 12;
  const tileWidth = Math.floor((width - 48 - gap * (cols - 1)) / cols);
  const tileHeight = Math.round(tileWidth * 1.5);

  if (!status) {
    return (
      <SafeAreaView style={h.safe} edges={["top"]}>
        <BackBar label="library" />
        <View style={h.scrollContent}>
          <EmptyHint>that shelf doesn&apos;t exist.</EmptyHint>
        </View>
      </SafeAreaView>
    );
  }

  const row = STATUS_ROW[status];
  const label = STATUS_LABEL[status];

  return (
    <SafeAreaView style={h.safe} edges={["top"]}>
      <BackBar label="library" />
      <ScrollView
        style={h.scroll}
        contentContainerStyle={h.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={label}
          subtitle={loading ? undefined : `${all.length} books`}
          right={<ViewToggle viewMode={viewMode} setViewMode={setViewMode} />}
        />

        <View style={s.addRow}>
          <InlineAdd
            placeholder={`add to ${label}…`}
            onAdd={handleAdd}
            libraryEntries={entries}
          />
        </View>

        <SearchBar
          search={filters.search}
          setSearch={(search) => setFilters({ ...filters, search })}
          filterCount={activeFilterCount(filters) + (filters.mood ? 1 : 0)}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
        />
        {filtersOpen ? (
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            sort={sort}
            setSort={setSort}
            options={options}
          />
        ) : null}

        {loading ? (
          <ActivityIndicator color={C.fgMuted} style={{ marginTop: 48 }} />
        ) : error ? (
          <Text style={s.error}>couldn&apos;t load. {error}</Text>
        ) : (
          <>
            {upNext.length > 0 && !filtering ? (
              <View style={s.section}>
                <Text style={s.sectionLabel}>up next</Text>
                <View style={s.upNextList}>
                  {upNext.map((b, i) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                      style={({ pressed }) => [
                        s.upNextRow,
                        i > 0 && s.upNextDivider,
                        pressed && { backgroundColor: C.paperDeep },
                      ]}
                    >
                      <BookCoverThumb
                        coverUrl={b.coverUrl}
                        title={b.title || "untitled"}
                        author={b.author}
                        width={40}
                        height={60}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.upNextTitle} numberOfLines={2}>
                          {b.title || "untitled"}
                        </Text>
                        {b.author ? (
                          <Text style={s.upNextAuthor} numberOfLines={1}>
                            {b.author}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={s.chevron}>›</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={s.section}>
              <Text style={s.sectionLabel}>
                {filtering ? "matches" : "all"} · {filtered.length}
              </Text>
              {filtered.length === 0 ? (
                <EmptyHint>
                  {filtering ? "no matches." : "no books here yet."}
                </EmptyHint>
              ) : viewMode === "grid" ? (
                <View style={[s.grid, { gap }]}>
                  {filtered.map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                      style={{ width: tileWidth, gap: 4 }}
                    >
                      <BookCoverThumb
                        coverUrl={b.coverUrl}
                        title={b.title || "untitled"}
                        author={b.author}
                        width={tileWidth}
                        height={tileHeight}
                      />
                      <Text style={s.gridTitle} numberOfLines={2}>
                        {b.title || "untitled"}
                      </Text>
                      {b.rating > 0 ? (
                        <Stars rating={b.rating} size={10} />
                      ) : b.author ? (
                        <Text style={s.gridAuthor} numberOfLines={1}>
                          {b.author}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  {filtered.map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                    >
                      <BookRow
                        entry={b}
                        symbol={row.symbol}
                        symbolColor={row.color}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  addRow: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    marginBottom: 14,
  },
  section: { marginTop: 18, marginBottom: 8 },
  sectionLabel: {
    fontSize: 11,
    color: C.fgMuted,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  error: { color: C.danger, paddingVertical: 16 },
  upNextList: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: C.paper,
    overflow: "hidden",
  },
  upNextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  upNextDivider: { borderTopWidth: 1, borderTopColor: C.line },
  upNextTitle: { fontSize: 15, color: C.fg },
  upNextAuthor: { fontSize: 12, color: C.fgMuted },
  chevron: { fontSize: 20, color: C.fgFaint },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridTitle: { fontSize: 12, color: C.fg, fontWeight: "500" },
  gridAuthor: { fontSize: 10, color: C.fgFaint },
});
