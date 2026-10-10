import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  activeFilterCount,
  EMPTY_LIBRARY_FILTERS,
  hasActiveFilters,
  libraryFilterOptions,
  matchesLibraryFilters,
  shelveFinished,
  sortBooks,
  type BookEntry,
  type LibraryFilterState,
  type LibrarySort,
} from "@spine/shared";
import { TopBar, homeStyles as s } from "@/components/home";
import { BookRow } from "@/components/library/BookRow";
import { InlineAdd } from "@/components/library/InlineAdd";
import {
  FilterPanel,
  SearchBar,
  ViewToggle,
} from "@/components/library/LibraryFilters";
import { YearShelf } from "@/components/library/YearShelf";
import { C } from "@/components/login/tokens";
import { useBooks } from "@/lib/booksContext";
import { createEntry, lookupBook, type CatalogEntry } from "@/lib/library";
import { makeEntry } from "@/lib/makeEntry";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

const SHELF_LINKS = [
  { label: "reading", href: "/library/reading" },
  { label: "want to read", href: "/library/want-to-read" },
  { label: "read", href: "/library/finished" },
  { label: "dnf", href: "/library/did-not-finish" },
  { label: "series", href: "/library/series" },
  { label: "re-reads", href: "/library/rereads" },
  { label: "recommendations", href: "/library/recommendations" },
] as const;

export default function LibraryTab() {
  const {
    books: entries,
    loading,
    error,
    refresh,
    addBook,
    removeBook,
  } = useBooks();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<LibraryFilterState>(
    EMPTY_LIBRARY_FILTERS,
  );
  const [sort, setSort] = useState<LibrarySort>("date-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const options = useMemo(() => libraryFilterOptions(entries), [entries]);
  const filtering = hasActiveFilters(filters);

  const handleAdd = useCallback(
    async (
      status: "reading" | "want-to-read",
      catalog?: CatalogEntry,
      raw?: string,
    ) => {
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
    [addBook, removeBook, refresh],
  );

  const { currentlyReading, wantToRead, dnf, yearGroups } = useMemo(() => {
    const matching = entries.filter((e) => matchesLibraryFilters(e, filters));
    const of = (status: BookEntry["status"]) =>
      sortBooks(
        matching.filter((e) => e.status === status),
        sort,
      );
    return {
      currentlyReading: of("reading"),
      wantToRead: of("want-to-read"),
      dnf: of("did-not-finish"),
      yearGroups: shelveFinished(
        matching.filter((e) => e.status === "finished"),
        sort,
      ),
    };
  }, [entries, filters, sort]);

  // Grid sizing: 3 cols on phones, 4 on wider screens.
  const cols = width >= 700 ? 4 : 3;
  const sidePadding = 24;
  const gap = 12;
  const tileWidth = Math.floor(
    (width - sidePadding * 2 - gap * (cols - 1)) / cols,
  );
  const tileHeight = Math.round(tileWidth * 1.5);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <TopBar />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={local.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={local.header}>
          <Text style={local.title}>library</Text>
          <View style={local.headerRight}>
            <Text style={local.count}>
              {loading ? "" : `${entries.length} books`}
            </Text>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={local.shelves}
          contentContainerStyle={{ gap: 8 }}
        >
          {SHELF_LINKS.map((l) => (
            <Pressable
              key={l.href}
              onPress={() => router.push(l.href)}
              style={({ pressed }) => [
                local.shelfChip,
                pressed && { backgroundColor: C.paperDeep },
              ]}
            >
              <Text style={local.shelfChipText}>{l.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

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
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={C.fgMuted} />
          </View>
        ) : error ? (
          <Text style={local.error}>couldn&apos;t load library. {error}</Text>
        ) : (
          <>
            <View style={local.sectionBlock}>
              <Text style={s.sectionLabel}>currently reading</Text>
              {currentlyReading.length > 0 ? (
                <View style={local.list}>
                  {currentlyReading.map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                    >
                      <BookRow entry={b} symbol="○" symbolColor={C.terra} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <InlineAdd
                placeholder="what are you reading?"
                onAdd={(c, r) => handleAdd("reading", c, r)}
                libraryEntries={entries}
              />
            </View>

            <View style={local.sectionBlock}>
              <View style={local.sectionHeaderRow}>
                <Text style={s.sectionLabel}>want to read</Text>
                {wantToRead.length > 6 ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => router.push("/library/want-to-read")}
                  >
                    <Text style={local.allLink}>all {wantToRead.length} →</Text>
                  </Pressable>
                ) : null}
              </View>
              {wantToRead.length > 0 ? (
                <View style={local.list}>
                  {wantToRead.slice(0, 6).map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                    >
                      <BookRow entry={b} symbol="◌" symbolColor={C.plum} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <InlineAdd
                placeholder="add to tbr…"
                onAdd={(c, r) => handleAdd("want-to-read", c, r)}
                libraryEntries={entries}
              />
            </View>

            {yearGroups.length === 0 ? (
              <Text style={local.emptyHint}>
                {filtering
                  ? "no finished books match."
                  : "no finished books yet."}
              </Text>
            ) : (
              yearGroups.map((group) => (
                <YearShelf
                  key={group.kind === "year" ? group.year : group.kind}
                  group={group}
                  viewMode={viewMode}
                  tileWidth={tileWidth}
                  tileHeight={tileHeight}
                />
              ))
            )}

            {dnf.length > 0 ? (
              <View style={local.sectionBlock}>
                <View style={local.sectionHeaderRow}>
                  <Text style={s.sectionLabel}>did not finish</Text>
                  {dnf.length > 6 ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => router.push("/library/did-not-finish")}
                    >
                      <Text style={local.allLink}>all {dnf.length} →</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={local.list}>
                  {dnf.slice(0, 6).map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                    >
                      <BookRow entry={b} symbol="◌" symbolColor={C.fgMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 18,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 32,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1.2,
  },
  count: { fontSize: 11, color: C.fgMuted, letterSpacing: 0.3 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  error: { color: "#b03a2e", paddingVertical: 16 },
  sectionBlock: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  allLink: { fontSize: 11, color: C.fgFaint, letterSpacing: 0.3 },
  list: { marginTop: 4, gap: 4 },
  shelves: {
    flexGrow: 0,
    marginHorizontal: -24,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  shelfChip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.paper,
  },
  shelfChipText: { fontSize: 12, color: C.plum },
  emptyHint: {
    fontSize: 12,
    color: C.fgFaint,
    paddingVertical: 16,
  },
});
