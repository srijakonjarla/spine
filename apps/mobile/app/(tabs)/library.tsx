import { useCallback, useEffect, useMemo, useState } from "react";
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
import { dateYear, localDateStr, type BookEntry } from "@spine/shared";
import { TopBar, homeStyles as s } from "@/components/home";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { InlineAdd } from "@/components/library/InlineAdd";
import { C } from "@/components/login/tokens";
import {
  createEntry,
  getEntries,
  lookupBook,
  type CatalogEntry,
} from "@/lib/library";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makeEntry(
  status: "reading" | "want-to-read",
  catalog?: CatalogEntry,
  raw?: string,
): BookEntry | null {
  const title = (catalog?.title ?? raw ?? "").trim();
  if (!title) return null;
  const now = new Date();
  return {
    id: uuid(),
    catalogBookId: "",
    title: catalog?.title ?? title,
    author: catalog?.author ?? "",
    publisher: catalog?.publisher ?? "",
    releaseDate: catalog?.releaseDate ?? "",
    genres: catalog?.genres ?? [],
    userGenres: [],
    moodTags: [],
    diversityTags: catalog?.diversityTags ?? [],
    userDiversityTags: [],
    bookshelves: [],
    status,
    format: "",
    audioDurationMinutes: catalog?.audioDurationMinutes ?? null,
    dateStarted: status === "reading" ? localDateStr(now) : "",
    dateFinished: "",
    dateShelved: status === "want-to-read" ? localDateStr(now) : "",
    rating: 0,
    feeling: "",
    thoughts: [],
    reads: [],
    bookmarked: false,
    upNext: false,
    coverUrl: catalog?.coverUrl ?? "",
    isbn: catalog?.isbn ?? "",
    pageCount: catalog?.pageCount ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export default function LibraryTab() {
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const refresh = useCallback(async () => {
    try {
      const data = await getEntries();
      setEntries(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEntries()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      // Optimistic insert
      setEntries((prev) => [entry, ...prev]);
      try {
        await createEntry(entry);
        await refresh();
      } catch (e) {
        setEntries((prev) => prev.filter((b) => b.id !== entry.id));
        Alert.alert(
          "couldn't add book",
          e instanceof Error ? e.message : "try again later.",
        );
      }
    },
    [refresh],
  );

  const currentlyReading = useMemo(
    () => entries.filter((e) => e.status === "reading"),
    [entries],
  );
  const wantToRead = useMemo(
    () => entries.filter((e) => e.status === "want-to-read"),
    [entries],
  );

  const yearGroups = useMemo(() => {
    const finished = entries.filter((e) => e.status === "finished");
    const map = new Map<number, BookEntry[]>();
    finished.forEach((b) => {
      const y = b.dateFinished ? (dateYear(b.dateFinished) ?? 0) : 0;
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(b);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, books]) => ({
        year,
        books: books.sort((a, b) =>
          (b.dateFinished ?? "").localeCompare(a.dateFinished ?? ""),
        ),
      }));
  }, [entries]);

  // Grid: 3 columns on phones, 4 on wider screens
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
          <Text style={local.count}>
            {loading ? "" : `${entries.length} books`}
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={C.fgMuted} />
          </View>
        ) : error ? (
          <Text style={local.error}>couldn't load library. {error}</Text>
        ) : (
          <>
            <View style={local.sectionBlock}>
              <Text style={s.sectionLabel}>currently reading</Text>
              {currentlyReading.length > 0 ? (
                <View style={local.list}>
                  {currentlyReading.map((b) => (
                    <BookRow
                      key={b.id}
                      entry={b}
                      symbol="○"
                      symbolColor={C.terra}
                    />
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
                {wantToRead.length > 8 ? (
                  <Text style={local.allLink}>{wantToRead.length} total</Text>
                ) : null}
              </View>
              {wantToRead.length > 0 ? (
                <View style={local.list}>
                  {wantToRead.slice(0, 8).map((b) => (
                    <BookRow
                      key={b.id}
                      entry={b}
                      symbol="◌"
                      symbolColor={C.fgFaint}
                    />
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
              yearGroups.map(({ year, books }) => (
                <View key={year} style={local.yearBlock}>
                  <View style={local.shelfDivider}>
                    <View style={local.dividerLine} />
                    <Text style={local.yearLabel}>
                      {year || "—"} · {books.length}
                    </Text>
                    <View style={local.dividerLine} />
                  </View>
                  <View style={local.grid}>
                    {books.map((b) => (
                      <Pressable
                        key={b.id}
                        style={[local.gridItem, { width: tileWidth }]}
                      >
                        <BookCoverThumb
                          coverUrl={b.coverUrl}
                          title={b.title || "untitled"}
                          author={b.author}
                          width={tileWidth}
                          height={tileHeight}
                        />
                        <Text style={local.gridTitle} numberOfLines={2}>
                          {b.title || "untitled"}
                        </Text>
                        {b.author ? (
                          <Text style={local.gridAuthor} numberOfLines={1}>
                            {b.author}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function BookRow({
  entry,
  symbol,
  symbolColor,
}: {
  entry: BookEntry;
  symbol: string;
  symbolColor: string;
}) {
  return (
    <View style={local.row}>
      <Text style={[local.rowSymbol, { color: symbolColor }]}>{symbol}</Text>
      <Text style={local.rowTitle} numberOfLines={1}>
        {entry.title || "untitled"}
      </Text>
      {entry.author ? (
        <Text style={local.rowAuthor} numberOfLines={1}>
          {entry.author}
        </Text>
      ) : null}
    </View>
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
  count: {
    fontSize: 11,
    color: C.fgMuted,
    letterSpacing: 0.3,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  rowSymbol: { fontSize: 12, width: 14 },
  rowTitle: { flex: 1, fontSize: 14, color: C.fg },
  rowAuthor: { fontSize: 11, color: C.fgFaint, maxWidth: 120 },
  emptyHint: {
    fontSize: 12,
    color: C.fgFaint,
    paddingVertical: 16,
  },
  yearBlock: { marginBottom: 20 },
  shelfDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    marginBottom: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  yearLabel: {
    fontFamily: SERIF,
    fontSize: 12,
    color: C.fgMuted,
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridItem: { gap: 6 },
  gridTitle: {
    fontSize: 12,
    color: C.fg,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  gridAuthor: { fontSize: 10, color: C.fgFaint },
});
