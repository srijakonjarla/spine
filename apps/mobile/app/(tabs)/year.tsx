import { useMemo, useState } from "react";
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
  MONTH_NAMES,
  averageRating,
  dateMonth,
  formatShortDate,
  hashStr,
  localDateStr,
  type BookEntry,
} from "@spine/shared";
import { TopBar, homeStyles as h } from "@/components/home";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { C, RGB, SERIF, alpha } from "@/components/login/tokens";
import { MiniMonthCal } from "@/components/year/MiniMonthCal";
import { useYearData } from "@/lib/useYearData";

function spineColor(title: string) {
  return C.yearShelf[hashStr(title) % C.yearShelf.length];
}
function spineHeight(title: string) {
  return 44 + (hashStr(title) % 26);
}

export default function YearTab() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const {
    loading,
    error,
    allEntries,
    finishedBooks,
    loggedDates,
    goals,
    lists,
    quotes,
  } = useYearData(year);

  const isCurrentYear = year === now.getFullYear();
  const todayStr = localDateStr(now);
  const upNextBooks = allEntries.filter((b) => b.upNext);
  const avgRating = averageRating(finishedBooks);
  const autoGoal = goals.find((g) => g.isAuto) ?? null;
  const customGoals = goals.filter((g) => !g.isAuto);
  const finishedDates = useMemo(
    () => new Set(finishedBooks.map((b) => b.dateFinished)),
    [finishedBooks],
  );

  const shelfMonths = useMemo(() => {
    const byMonth: BookEntry[][] = Array.from({ length: 12 }, () => []);
    finishedBooks.forEach((b) => {
      if (b.dateFinished) byMonth[dateMonth(b.dateFinished) ?? 0].push(b);
    });
    return byMonth
      .map((books, monthIndex) => ({ monthIndex, books }))
      .filter(({ books }) => books.length > 0);
  }, [finishedBooks]);

  const statusLabel = isCurrentYear
    ? `in progress · ${formatShortDate(todayStr)}`
    : `complete · ${finishedBooks.length} books`;

  const cols = width >= 700 ? 4 : 3;
  const gap = 8;
  const calWidth = Math.floor((width - 48 - gap * (cols - 1)) / cols);

  const stats = [
    {
      val: finishedBooks.length,
      label: "books read",
      sub: autoGoal ? `goal: ${autoGoal.target}` : null,
    },
    { val: loggedDates.size, label: "days read", sub: null },
    { val: avgRating ? `${avgRating}★` : "—", label: "avg rating", sub: null },
    { val: quotes.length, label: "quotes saved", sub: null },
  ];

  return (
    <SafeAreaView style={h.safe} edges={["top"]}>
      <TopBar />
      <ScrollView
        style={h.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.eyebrow}>your reading year</Text>
          <View style={s.yearRow}>
            <Pressable
              hitSlop={10}
              onPress={() => setYear((y) => y - 1)}
              accessibilityLabel="previous year"
            >
              <Text style={s.stepper}>‹</Text>
            </Pressable>
            <Text style={s.year}>{year}</Text>
            <Pressable
              hitSlop={10}
              disabled={isCurrentYear}
              onPress={() => setYear((y) => y + 1)}
              accessibilityLabel="next year"
            >
              <Text style={[s.stepper, isCurrentYear && { opacity: 0.2 }]}>
                ›
              </Text>
            </Pressable>
          </View>
          <Text style={s.status}>{statusLabel}</Text>

          <View style={s.statGrid}>
            {stats.map(({ val, label, sub }) => (
              <View key={label} style={s.stat}>
                <Text style={s.statVal}>{loading ? "·" : val}</Text>
                <Text style={s.statLabel}>{label}</Text>
                {sub ? <Text style={s.statSub}>{sub}</Text> : null}
              </View>
            ))}
          </View>

          {!loading && (autoGoal || customGoals.length > 0) ? (
            <View style={{ gap: 10 }}>
              {autoGoal && autoGoal.target > 0 ? (
                <GoalBlock
                  name={autoGoal.name || "reading goal"}
                  line={`${finishedBooks.length} of ${autoGoal.target} books`}
                  progress={Math.min(1, finishedBooks.length / autoGoal.target)}
                  color={C.terra}
                  onPress={() => router.push("/(tabs)/goals")}
                />
              ) : null}
              {customGoals.map((g) => {
                const p =
                  g.target > 0 ? Math.min(1, g.bookIds.length / g.target) : 0;
                return (
                  <GoalBlock
                    key={g.id}
                    name={g.name}
                    line={`${g.bookIds.length} of ${g.target}`}
                    progress={p}
                    color={C.sage}
                    onPress={() => router.push("/(tabs)/goals")}
                  />
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={s.body}>
          <View style={s.navRow}>
            <NavChip
              label="year in review"
              onPress={() => router.push(`/year/${year}/review`)}
            />
            <NavChip
              label="books read"
              onPress={() => router.push(`/year/${year}/read`)}
            />
            <NavChip
              label="quotes"
              onPress={() => router.push(`/year/${year}/quotes`)}
            />
          </View>

          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator color={C.fgMuted} />
            </View>
          ) : error ? (
            <Text style={s.error}>
              couldn&apos;t load {year}. {error}
            </Text>
          ) : (
            <>
              <Text style={s.sectionTitle}>{year} at a glance</Text>
              <View style={[s.calGrid, { gap }]}>
                {MONTH_NAMES.map((_, i) => (
                  <MiniMonthCal
                    key={i}
                    year={year}
                    monthIndex={i}
                    loggedDates={loggedDates}
                    finishedDates={finishedDates}
                    todayStr={todayStr}
                    isCurrentYear={isCurrentYear}
                    width={calWidth}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/calendar",
                        params: { year: String(year), month: String(i) },
                      })
                    }
                  />
                ))}
              </View>

              {upNextBooks.length > 0 ? (
                <>
                  <Text style={s.sectionTitle}>up next</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                    style={s.bleed}
                  >
                    {upNextBooks.map((b) => (
                      <Pressable
                        key={b.id}
                        onPress={() => router.push(`/book/${b.id}`)}
                        style={({ pressed }) => [
                          s.upNext,
                          pressed && { backgroundColor: C.paperDeep },
                        ]}
                      >
                        <BookCoverThumb
                          coverUrl={b.coverUrl}
                          title={b.title}
                          author={b.author}
                          width={28}
                          height={40}
                        />
                        <View style={{ maxWidth: 140 }}>
                          <Text style={s.upNextTitle} numberOfLines={1}>
                            {b.title}
                          </Text>
                          {b.author ? (
                            <Text style={s.upNextAuthor} numberOfLines={1}>
                              {b.author}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {shelfMonths.length > 0 ? (
                <>
                  <View style={s.sectionHead}>
                    <Text style={[s.sectionTitle, { marginBottom: 0 }]}>
                      your {year} bookshelf
                    </Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => router.push(`/year/${year}/read`)}
                    >
                      <Text style={s.link}>all books read →</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.shelf}
                    contentContainerStyle={s.shelfInner}
                  >
                    {shelfMonths.map(({ monthIndex, books }) => (
                      <View key={monthIndex} style={s.shelfMonth}>
                        <Text style={s.shelfLabel}>
                          {MONTH_NAMES[monthIndex].slice(0, 3)}
                        </Text>
                        {books.map((b, i) => (
                          <Pressable
                            key={`${b.id}-${i}`}
                            onPress={() => router.push(`/book/${b.id}`)}
                            accessibilityLabel={b.title}
                            style={{
                              width: 14,
                              height: spineHeight(b.title),
                              borderRadius: 2,
                              backgroundColor: spineColor(b.title),
                            }}
                          />
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {lists.length > 0 ? (
                <>
                  <View style={s.sectionHead}>
                    <Text style={[s.sectionTitle, { marginBottom: 0 }]}>
                      {year} lists
                    </Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => router.push("/(tabs)/lists")}
                    >
                      <Text style={s.link}>all lists →</Text>
                    </Pressable>
                  </View>
                  <View style={{ gap: 10 }}>
                    {lists.map((list) => (
                      <Pressable
                        key={list.id}
                        onPress={() => router.push(`/list/${list.id}`)}
                        style={({ pressed }) => [
                          s.listCard,
                          pressed && { backgroundColor: C.paperDeep },
                        ]}
                      >
                        <View style={s.listHead}>
                          <Text style={s.listTitle} numberOfLines={2}>
                            {list.title}
                          </Text>
                          <Text style={s.listCount}>{list.items.length}</Text>
                        </View>
                        {list.items.length === 0 ? (
                          <Text style={s.listEmpty}>empty</Text>
                        ) : (
                          list.items.slice(0, 4).map((item, i) => (
                            <View key={item.id} style={s.listItem}>
                              <Text style={s.listNum}>{i + 1}.</Text>
                              <Text style={s.listItemText} numberOfLines={1}>
                                {item.title}
                              </Text>
                            </View>
                          ))
                        )}
                        {list.items.length > 4 ? (
                          <Text style={s.listMore}>
                            +{list.items.length - 4} more
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalBlock({
  name,
  line,
  progress,
  color,
  onPress,
}: {
  name: string;
  line: string;
  progress: number;
  color: string;
  onPress: () => void;
}) {
  const pct = Math.round(progress * 100);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.goal, pressed && { opacity: 0.8 }]}
    >
      <Text style={s.goalName}>{name}</Text>
      <Text style={s.goalLine}>
        {line} · {pct}%
      </Text>
      <View style={s.goalTrack}>
        <View
          style={[s.goalFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
    </Pressable>
  );
}

function NavChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}
    >
      <Text style={s.chipText}>{label} →</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: C.plum,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
  },
  eyebrow: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 16,
    color: C.gold,
    marginBottom: 4,
  },
  yearRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepper: { fontSize: 34, color: alpha(RGB.cream, 0.6), lineHeight: 40 },
  year: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontWeight: "700",
    fontSize: 60,
    lineHeight: 66,
    color: C.white,
    letterSpacing: -2,
  },
  status: { fontSize: 13, color: alpha(RGB.cream, 0.45), marginBottom: 24 },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
    marginBottom: 22,
  },
  stat: { width: "50%" },
  statVal: {
    fontFamily: SERIF,
    fontWeight: "700",
    fontSize: 28,
    color: C.white,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: alpha(RGB.cream, 0.55),
  },
  statSub: { fontSize: 10, color: alpha(RGB.cream, 0.3), marginTop: 2 },
  goal: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: alpha(RGB.cream, 0.07),
    borderWidth: 1,
    borderColor: alpha(RGB.cream, 0.1),
  },
  goalName: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: alpha(RGB.gold, 0.7),
    marginBottom: 4,
  },
  goalLine: {
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: "600",
    color: C.white,
    marginBottom: 8,
  },
  goalTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: alpha(RGB.cream, 0.1),
  },
  goalFill: { height: "100%", borderRadius: 3 },
  body: { paddingHorizontal: 24, paddingTop: 20 },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 28 },
  chip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: C.paper,
  },
  chipText: { fontSize: 12, color: C.plum, fontWeight: "500" },
  error: { color: C.danger, paddingVertical: 16 },
  sectionTitle: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 20,
    color: C.fgHeading,
    marginBottom: 14,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 32,
    marginBottom: 14,
  },
  link: { fontSize: 12, color: C.fgMuted },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  bleed: { marginHorizontal: -24, paddingHorizontal: 24, flexGrow: 0 },
  upNext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  upNextTitle: { fontSize: 12, fontWeight: "600", color: C.fgHeading },
  upNextAuthor: { fontSize: 11, color: C.fgMuted, marginTop: 1 },
  shelf: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    flexGrow: 0,
  },
  shelfInner: {
    padding: 12,
    alignItems: "flex-end",
    gap: 10,
  },
  shelfMonth: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  shelfLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.fgFaint,
    marginRight: 6,
    paddingBottom: 2,
  },
  listCard: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 14,
  },
  listHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  listTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: C.fgHeading },
  listCount: {
    fontSize: 10,
    fontWeight: "600",
    color: C.fgMuted,
    backgroundColor: C.paperDeep,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
  },
  listEmpty: { fontSize: 12, fontStyle: "italic", color: C.fgFaint },
  listItem: { flexDirection: "row", gap: 6, paddingVertical: 1 },
  listNum: { width: 18, fontSize: 11, color: C.fgFaint },
  listItemText: { flex: 1, fontSize: 12, color: C.fg },
  listMore: { fontSize: 11, color: C.fgFaint, paddingLeft: 24, marginTop: 2 },
});
