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
import { dateYear, type BookEntry } from "@spine/shared";
import { TopBar, homeStyles as s } from "@/components/home";
import { BookRow } from "@/components/library/BookRow";
import { InlineAdd } from "@/components/library/InlineAdd";
import {
  MoodChipRow,
  SearchBar,
  ViewToggle,
  normalizeMood,
} from "@/components/library/LibraryFilters";
import { YearShelf, type ShelfGroup } from "@/components/library/YearShelf";
import { C } from "@/components/login/tokens";
import { useBooks } from "@/lib/booksContext";
import { createEntry, lookupBook, type CatalogEntry } from "@/lib/library";
import { makeEntry } from "@/lib/makeEntry";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

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
  const [search, setSearch] = useState("");
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(true);

  const allMoods = useMemo(
    () =>
      Array.from(
        new Set(entries.flatMap((e) => (e.moodTags ?? []).map(normalizeMood))),
      )
        .filter(Boolean)
        .sort(),
    [entries],
  );

  const matchesFilter = useCallback(
    (e: BookEntry) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.author ?? "").toLowerCase().includes(q);
      const matchesMood =
        !activeMood ||
        (e.moodTags ?? []).some((m) => normalizeMood(m) === activeMood);
      return matchesSearch && matchesMood;
    },
    [search, activeMood],
  );

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

  const currentlyReading = useMemo(
    () => entries.filter((e) => e.status === "reading" && matchesFilter(e)),
    [entries, matchesFilter],
  );
  const wantToRead = useMemo(
    () =>
      entries.filter((e) => e.status === "want-to-read" && matchesFilter(e)),
    [entries, matchesFilter],
  );

  const yearGroups = useMemo<ShelfGroup[]>(() => {
    const finished = entries.filter(
      (e) => e.status === "finished" && matchesFilter(e),
    );
    const yearMap = new Map<number, BookEntry[]>();
    const earlier: BookEntry[] = [];
    finished.forEach((b) => {
      const y = b.dateFinished ? dateYear(b.dateFinished) : null;
      if (y == null) {
        earlier.push(b);
        return;
      }
      if (!yearMap.has(y)) yearMap.set(y, []);
      yearMap.get(y)!.push(b);
    });
    const groups: ShelfGroup[] = Array.from(yearMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, books]) => ({
        kind: "year",
        year,
        books: books.sort((a, b) =>
          (b.dateFinished ?? "").localeCompare(a.dateFinished ?? ""),
        ),
      }));
    if (earlier.length > 0) {
      groups.push({
        kind: "earlier",
        books: earlier.sort((a, b) =>
          (a.title ?? "").localeCompare(b.title ?? ""),
        ),
      });
    }
    return groups;
  }, [entries, matchesFilter]);

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

        <SearchBar
          search={search}
          setSearch={setSearch}
          hasMoods={allMoods.length > 0}
          tagsOpen={tagsOpen}
          setTagsOpen={setTagsOpen}
        />
        {allMoods.length > 0 && tagsOpen ? (
          <MoodChipRow
            moods={allMoods}
            activeMood={activeMood}
            setActiveMood={setActiveMood}
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
              <Text style={local.emptyHint}>no finished books yet.</Text>
            ) : (
              yearGroups.map((group) => (
                <YearShelf
                  key={group.kind === "year" ? group.year : "earlier"}
                  group={group}
                  viewMode={viewMode}
                  tileWidth={tileWidth}
                  tileHeight={tileHeight}
                />
              ))
            )}
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
  emptyHint: {
    fontSize: 12,
    color: C.fgFaint,
    paddingVertical: 16,
  },
});
