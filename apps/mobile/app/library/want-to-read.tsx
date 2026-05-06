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
import { homeStyles as h } from "@/components/home";
import { GridIcon, ListIcon } from "@/components/icons";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { BookRow } from "@/components/library/BookRow";
import { InlineAdd } from "@/components/library/InlineAdd";
import { C } from "@/components/login/tokens";
import { useBooks } from "@/lib/booksContext";
import { createEntry, lookupBook, type CatalogEntry } from "@/lib/library";
import { makeEntry } from "@/lib/makeEntry";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export default function WantToReadScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    books: entries,
    loading,
    error,
    refresh,
    addBook,
    removeBook,
  } = useBooks();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const all = useMemo(
    () => entries.filter((b) => b.status === "want-to-read"),
    [entries],
  );
  const upNext = useMemo(() => all.filter((b) => b.upNext), [all]);

  const handleAdd = useCallback(
    async (catalog?: CatalogEntry, raw?: string) => {
      const enriched =
        catalog ?? (raw ? await lookupBook(raw).catch(() => null) : null);
      const entry = makeEntry("want-to-read", enriched ?? undefined, raw);
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

  // Grid sizing — matches the library tab
  const cols = width >= 700 ? 4 : 3;
  const sidePadding = 24;
  const gap = 12;
  const tileWidth = Math.floor(
    (width - sidePadding * 2 - gap * (cols - 1)) / cols,
  );
  const tileHeight = Math.round(tileWidth * 1.5);

  return (
    <SafeAreaView style={h.safe} edges={["top"]}>
      <View style={s.topBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Text style={s.back}>← library</Text>
        </Pressable>
      </View>
      <ScrollView
        style={h.scroll}
        contentContainerStyle={h.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View>
            <Text style={s.title}>want to read</Text>
            <Text style={s.count}>{loading ? "" : `${all.length} books`}</Text>
          </View>
          <View style={s.viewToggle}>
            <Pressable
              hitSlop={6}
              onPress={() => setViewMode("grid")}
              style={[s.viewBtn, viewMode === "grid" && s.viewBtnActive]}
            >
              <GridIcon
                size={16}
                color={viewMode === "grid" ? C.plum : C.fgFaint}
              />
            </Pressable>
            <Pressable
              hitSlop={6}
              onPress={() => setViewMode("list")}
              style={[s.viewBtn, viewMode === "list" && s.viewBtnActive]}
            >
              <ListIcon
                size={16}
                color={viewMode === "list" ? C.plum : C.fgFaint}
              />
            </Pressable>
          </View>
        </View>

        <View style={s.addRow}>
          <InlineAdd
            placeholder="add to tbr…"
            onAdd={handleAdd}
            libraryEntries={entries}
          />
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={C.fgMuted} />
          </View>
        ) : error ? (
          <Text style={s.error}>couldn&apos;t load. {error}</Text>
        ) : (
          <>
            {upNext.length > 0 ? (
              <View style={s.section}>
                <Text style={s.sectionLabel}>up next</Text>
                <View style={s.upNextList}>
                  {upNext.map((b, i) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                      style={({ pressed }) => [
                        s.upNextRow,
                        pressed && { backgroundColor: C.paperDeep },
                      ]}
                    >
                      <BookCoverThumb
                        coverUrl={b.coverUrl}
                        title={b.title || "untitled"}
                        author={b.author}
                        width={56}
                        height={84}
                      />
                      <View style={s.upNextText}>
                        <Text style={s.upNextTitle} numberOfLines={2}>
                          {b.title || "untitled"}
                        </Text>
                        {b.author ? (
                          <Text style={s.upNextAuthor} numberOfLines={1}>
                            {b.author}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={s.upNextChevron}>›</Text>
                      {i < upNext.length - 1 ? (
                        <View style={s.upNextDivider} />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={s.section}>
              <Text style={s.sectionLabel}>all · {all.length}</Text>
              {all.length === 0 ? (
                <Text style={s.emptyHint}>nothing on your tbr yet.</Text>
              ) : viewMode === "grid" ? (
                <View style={s.grid}>
                  {all.map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                      style={[s.gridItem, { width: tileWidth }]}
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
                      {b.author ? (
                        <Text style={s.gridAuthor} numberOfLines={1}>
                          {b.author}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={s.list}>
                  {all.map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/book/${b.id}`)}
                    >
                      <BookRow entry={b} symbol="◌" symbolColor={C.plum} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
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
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 4,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 32,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1.2,
  },
  count: { fontSize: 12, color: C.fgMuted, letterSpacing: 0.3, marginTop: 2 },
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
  addRow: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    marginBottom: 18,
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    color: C.fgMuted,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 12,
  },
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
    paddingVertical: 12,
    position: "relative",
  },
  upNextText: { flex: 1, gap: 2 },
  upNextTitle: {
    fontFamily: SERIF,
    fontSize: 16,
    color: C.fg,
    letterSpacing: -0.2,
  },
  upNextAuthor: { fontSize: 12, color: C.fgMuted },
  upNextChevron: {
    fontSize: 20,
    color: C.fgFaint,
    marginLeft: 4,
  },
  upNextDivider: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 0,
    height: 1,
    backgroundColor: C.line,
  },
  error: { color: "#b03a2e", paddingVertical: 16 },
  emptyHint: { fontSize: 12, color: C.fgFaint, paddingVertical: 16 },
  list: { gap: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: { gap: 6 },
  gridTitle: {
    fontSize: 12,
    color: C.fg,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  gridAuthor: { fontSize: 10, color: C.fgFaint },
});
