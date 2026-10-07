import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  isReread,
  ratingTrend,
  readCount,
  readTimeline,
  rereadInsight,
  type BookEntry,
} from "@spine/shared";
import { homeStyles as h } from "@/components/home";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { C, RGB, SERIF, alpha } from "@/components/login/tokens";
import { BackBar, EmptyHint, ScreenHeader } from "@/components/ui/ScreenHeader";
import { Stars } from "@/components/ui/Stars";
import { getEntries } from "@/lib/library";

type Filter = "all" | "2x" | "3x+" | "improved" | "dropped";

const FILTER_LABEL: Record<Filter, string> = {
  all: "all",
  "2x": "↺ 2×",
  "3x+": "↺ 3×+",
  improved: "rating ↑",
  dropped: "rating ↓",
};

export default function RereadsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // Re-read history needs book_reads, so fetch the nested shape directly
  // rather than waiting on the shared cache to hydrate.
  useEffect(() => {
    getEntries({ include: "nested" })
      .then((all) => setEntries(all.filter(isReread)))
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      entries.filter((b) => {
        const count = readCount(b);
        const trend = ratingTrend(readTimeline(b));
        if (filter === "2x") return count === 2;
        if (filter === "3x+") return count >= 3;
        if (filter === "improved") return trend === "up";
        if (filter === "dropped") return trend === "down";
        return true;
      }),
    [entries, filter],
  );
  const insight = useMemo(() => rereadInsight(entries), [entries]);

  const cols = width >= 700 ? 4 : 2;
  const gap = 16;
  const tileWidth = Math.floor((width - 48 - gap * (cols - 1)) / cols);
  const tileHeight = Math.round(tileWidth * 1.5);

  return (
    <SafeAreaView style={h.safe} edges={["top"]}>
      <BackBar label="library" />
      <ScrollView
        style={h.scroll}
        contentContainerStyle={h.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="re-reads"
          subtitle={
            entries.length > 0
              ? `${entries.length} ${entries.length === 1 ? "book" : "books"} · each one a different conversation`
              : undefined
          }
        />

        {loading ? (
          <ActivityIndicator color={C.fgMuted} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={s.error}>couldn&apos;t load. {error}</Text>
        ) : entries.length === 0 ? (
          <EmptyHint>
            no re-reads yet. start a re-read from any finished book.
          </EmptyHint>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              style={s.filters}
            >
              {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[s.chip, filter === f && s.chipActive]}
                >
                  <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                    {FILTER_LABEL[f]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {filtered.length === 0 ? (
              <EmptyHint>no books match this filter.</EmptyHint>
            ) : (
              <View style={[s.grid, { columnGap: gap, rowGap: 24 }]}>
                {filtered.map((book) => {
                  const count = readCount(book);
                  const timeline = readTimeline(book);
                  const trend = ratingTrend(timeline);
                  const isGold = count >= 3;
                  return (
                    <Pressable
                      key={book.id}
                      onPress={() => router.push(`/book/${book.id}`)}
                      style={({ pressed }) => [
                        { width: tileWidth },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View>
                        <BookCoverThumb
                          coverUrl={book.coverUrl}
                          title={book.title}
                          author={book.author}
                          width={tileWidth}
                          height={tileHeight}
                        />
                        <Text
                          style={[
                            s.badge,
                            isGold
                              ? { backgroundColor: C.gold, color: C.fgHeading }
                              : { backgroundColor: C.plum, color: C.white },
                          ]}
                        >
                          ↺ {count}×
                        </Text>
                      </View>
                      <Text style={s.title} numberOfLines={1}>
                        {book.title}
                      </Text>
                      {book.author ? (
                        <Text style={s.author} numberOfLines={1}>
                          {book.author}
                        </Text>
                      ) : null}
                      <View style={s.timeline}>
                        {timeline.map((r, i) => (
                          <View key={i} style={s.timelineItem}>
                            {r.rating > 0 ? (
                              <Stars rating={r.rating} size={10} />
                            ) : (
                              <Text style={s.timelineText}>
                                {r.status === "reading" ? "in progress" : "—"}
                              </Text>
                            )}
                            {i < timeline.length - 1 ? (
                              <Text style={s.timelineText}>→</Text>
                            ) : null}
                          </View>
                        ))}
                        {trend === "up" ? (
                          <Text style={[s.trend, { color: C.sage }]}>↑</Text>
                        ) : trend === "down" ? (
                          <Text style={[s.trend, { color: C.terra }]}>↓</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {insight && entries.length >= 2 ? (
              <View style={s.insight}>
                <Text style={s.insightIcon}>✦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightLabel}>a pattern in your re-reads</Text>
                  <Text style={s.insightText}>{insight}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  error: { color: C.danger, paddingVertical: 16 },
  filters: { flexGrow: 0, marginBottom: 22 },
  chip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: C.plum, borderColor: C.plum },
  chipText: { fontSize: 12, color: C.fgMuted },
  chipTextActive: { color: C.white },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    fontSize: 10,
    fontWeight: "700",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  title: { fontSize: 14, fontWeight: "500", color: C.fg, marginTop: 8 },
  author: { fontSize: 11, color: C.fgFaint, marginTop: 1 },
  timeline: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  timelineItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  timelineText: { fontSize: 10, color: C.fgMuted },
  trend: { fontSize: 11 },
  insight: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    borderLeftWidth: 3,
    borderLeftColor: C.lavender,
    backgroundColor: alpha(RGB.lavender, 0.08),
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 28,
  },
  insightIcon: { fontSize: 18, color: C.lavender },
  insightLabel: {
    fontStyle: "italic",
    fontSize: 13,
    color: C.lavenderMuted,
    marginBottom: 4,
  },
  insightText: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 14,
    lineHeight: 21,
    color: C.fg,
  },
});
