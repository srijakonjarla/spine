import { useMemo } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  MONTH_NAMES,
  dateMonth,
  formatShortDate,
  type BookEntry,
} from "@spine/shared";
import { homeStyles as h } from "@/components/home";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { C } from "@/components/login/tokens";
import {
  BackBar,
  EmptyHint,
  ScreenHeader,
  SectionLabel,
} from "@/components/ui/ScreenHeader";
import { Stars } from "@/components/ui/Stars";
import { useYearData } from "@/lib/useYearData";

export default function YearReadScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ year: string }>();
  const year = Number(params.year) || new Date().getFullYear();
  const { loading, error, finishedBooks } = useYearData(year);

  const months = useMemo(() => {
    const byMonth = new Map<number, BookEntry[]>();
    finishedBooks.forEach((b) => {
      const m = b.dateFinished ? dateMonth(b.dateFinished) : null;
      if (m == null) return;
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m)!.push(b);
    });
    return Array.from(byMonth.entries()).sort((a, b) => a[0] - b[0]);
  }, [finishedBooks]);

  const cols = width >= 700 ? 5 : 3;
  const gap = 12;
  const tileWidth = Math.floor((width - 48 - gap * (cols - 1)) / cols);
  const tileHeight = Math.round(tileWidth * 1.5);

  return (
    <SafeAreaView style={h.safe} edges={["top"]}>
      <BackBar label={String(year)} />
      <ScrollView
        style={h.scroll}
        contentContainerStyle={h.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow={`${year} · finished`}
          title="books i read"
          subtitle={
            finishedBooks.length > 0
              ? `${finishedBooks.length} ${finishedBooks.length === 1 ? "book" : "books"}`
              : undefined
          }
        />

        {loading ? (
          <ActivityIndicator color={C.fgMuted} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={s.error}>couldn&apos;t load. {error}</Text>
        ) : finishedBooks.length === 0 ? (
          <EmptyHint>{`no finished books logged for ${year} yet.`}</EmptyHint>
        ) : (
          months.map(([m, books]) => (
            <View key={m} style={s.month}>
              <SectionLabel count={books.length}>{MONTH_NAMES[m]}</SectionLabel>
              <View style={[s.grid, { gap }]}>
                {books.map((b, i) => (
                  <Pressable
                    key={`${b.id}-${i}`}
                    onPress={() => router.push(`/book/${b.id}`)}
                    style={({ pressed }) => [
                      { width: tileWidth, gap: 4 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <BookCoverThumb
                      coverUrl={b.coverUrl}
                      title={b.title}
                      author={b.author}
                      width={tileWidth}
                      height={tileHeight}
                    />
                    <Text style={s.title} numberOfLines={2}>
                      {b.title || "untitled"}
                    </Text>
                    <View style={s.meta}>
                      <Stars rating={b.rating} size={10} />
                      {b.dateFinished ? (
                        <Text style={s.date}>
                          {formatShortDate(b.dateFinished)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  error: { color: C.danger, paddingVertical: 16 },
  month: { marginBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  title: { fontSize: 12, fontWeight: "500", color: C.fg },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  date: { fontSize: 10, color: C.fgFaint },
});
