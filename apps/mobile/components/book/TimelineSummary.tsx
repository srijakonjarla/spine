import { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import {
  avgPagesPerDay,
  daysApart,
  formatShortDate,
  localDateStr,
  type Thought,
} from "@spine/shared";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export type TimeSlot = "morning" | "afternoon" | "evening" | "night";

export function timeOfDay(iso: string): TimeSlot {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

const SLOTS: { key: TimeSlot; color: string }[] = [
  { key: "morning", color: C.gold },
  { key: "afternoon", color: C.sage },
  { key: "evening", color: C.terra },
  { key: "night", color: C.lavender },
];

interface BestDay {
  dateStr: string;
  /** Pages read that day, or null when only note counts are available. */
  pages: number | null;
  notes: number;
  /** Last note written that day. */
  note: string;
}

/**
 * Summary blocks under the timeline — sessions/pages/pace/quotes, best
 * reading day, time-of-day chart, and reading period. Mirrors the sidebar
 * on web's Timeline tab; `thoughts` is already scoped to the viewed read.
 */
export function TimelineSummary({
  thoughts,
  pageCount,
  dateStarted,
  dateFinished,
  isOngoing,
  quoteCount,
}: {
  thoughts: Thought[];
  pageCount: number | null | undefined;
  dateStarted: string;
  dateFinished: string;
  isOngoing: boolean;
  quoteCount: number | null;
}) {
  const asc = useMemo(
    () => [...thoughts].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [thoughts],
  );

  // Pages read per day — the first logged page counts from 0.
  const pagesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    let prev = 0;
    for (const t of asc) {
      if (t.pageNumber == null) continue;
      const delta = t.pageNumber - prev;
      prev = t.pageNumber;
      if (delta <= 0) continue;
      const day = localDateStr(new Date(t.createdAt));
      map[day] = (map[day] ?? 0) + delta;
    }
    return map;
  }, [asc]);

  // Prefers page deltas; falls back to the day with the most notes.
  const bestDay = useMemo<BestDay | null>(() => {
    if (asc.length === 0) return null;
    const notesPerDay: Record<string, number> = {};
    const noteByDay: Record<string, string> = {};
    for (const t of asc) {
      const day = localDateStr(new Date(t.createdAt));
      notesPerDay[day] = (notesPerDay[day] ?? 0) + 1;
      noteByDay[day] = t.text;
    }
    const byPages = Object.entries(pagesByDay).sort((a, b) => b[1] - a[1]);
    if (byPages.length > 0) {
      const [dateStr, pages] = byPages[0];
      return {
        dateStr,
        pages,
        notes: notesPerDay[dateStr] ?? 0,
        note: noteByDay[dateStr] ?? "",
      };
    }
    const [dateStr, notes] = Object.entries(notesPerDay).sort(
      (a, b) => b[1] - a[1],
    )[0];
    return { dateStr, pages: null, notes, note: noteByDay[dateStr] ?? "" };
  }, [asc, pagesByDay]);

  const slots = useMemo(() => {
    const counts: Record<TimeSlot, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };
    for (const t of thoughts) counts[timeOfDay(t.createdAt)]++;
    return counts;
  }, [thoughts]);
  const maxSlot = Math.max(...Object.values(slots), 1);
  const dominant = SLOTS.reduce<TimeSlot | null>(
    (best, { key }) =>
      slots[key] > 0 && (best === null || slots[key] > slots[best])
        ? key
        : best,
    null,
  );

  const pace = avgPagesPerDay({
    pageCount: pageCount ?? 0,
    dateStarted,
    dateFinished,
  });
  const stats: { val: number | string; lbl: string }[] = [
    { val: thoughts.length, lbl: "sessions" },
    { val: pageCount || "—", lbl: "pages" },
    ...(pace !== null ? [{ val: pace, lbl: "avg p/day" }] : []),
    { val: quoteCount ?? "—", lbl: "quotes" },
  ];

  return (
    <View style={s.wrap}>
      <Text style={s.sectionLabel}>SUMMARY</Text>
      <View style={s.statGrid}>
        {stats.map(({ val, lbl }) => (
          <View key={lbl} style={s.statCard}>
            <Text style={s.statVal}>{val}</Text>
            <Text style={s.statLbl}>{lbl.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {bestDay ? (
        <>
          <Text style={s.sectionLabel}>BEST READING DAY</Text>
          <View style={s.card}>
            <Text style={s.bigVal}>
              {bestDay.pages != null
                ? `${bestDay.pages} pages`
                : `${bestDay.notes} ${bestDay.notes === 1 ? "note" : "notes"}`}
            </Text>
            <Text style={s.handNote} numberOfLines={3}>
              {formatShortDate(bestDay.dateStr)}
              {bestDay.note ? ` — ${bestDay.note}` : ""}
            </Text>
          </View>
        </>
      ) : null}

      {thoughts.length > 0 ? (
        <>
          <Text style={s.sectionLabel}>READING TIME OF DAY</Text>
          <View style={s.card}>
            <View style={s.bars}>
              {SLOTS.map(({ key, color }) => {
                const count = slots[key];
                const pct = count > 0 ? Math.max(count / maxSlot, 0.2) : 0;
                return (
                  <View
                    key={key}
                    accessibilityLabel={`${key}: ${count} session${count === 1 ? "" : "s"}`}
                    style={[
                      s.bar,
                      {
                        height: count > 0 ? `${pct * 100}%` : 3,
                        backgroundColor: color,
                        opacity: count === 0 ? 0.15 : 1,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <View style={s.barLabels}>
              {["6AM", "12PM", "6PM", "12AM"].map((l) => (
                <Text key={l} style={s.barLabel}>
                  {l}
                </Text>
              ))}
            </View>
            {dominant ? (
              <Text style={[s.handNote, { marginTop: 10 }]}>
                mostly {dominant}s ✦
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      {dateStarted ? (
        <>
          <Text style={s.sectionLabel}>READING PERIOD</Text>
          <View style={s.card}>
            <Text style={s.period}>
              {formatShortDate(dateStarted)}
              {dateFinished
                ? ` → ${formatShortDate(dateFinished)}`
                : isOngoing
                  ? " → now"
                  : ""}
            </Text>
            <Text style={s.statLbl}>
              {daysApart(dateStarted, dateFinished || localDateStr()) + 1} DAYS
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 28 },
  sectionLabel: {
    fontSize: 10,
    color: C.fgMuted,
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: "47.5%",
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
  },
  statVal: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: "700",
    color: C.fgHeading,
  },
  statLbl: {
    fontSize: 10,
    color: C.fgMuted,
    letterSpacing: 1.2,
    marginTop: 6,
  },
  card: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  bigVal: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: "700",
    color: C.fgHeading,
  },
  handNote: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 13,
    color: C.terraInk,
    marginTop: 6,
    lineHeight: 19,
  },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 48 },
  bar: { flex: 1, borderRadius: 3 },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  barLabel: { fontSize: 9, color: C.fgMuted, letterSpacing: 0.8 },
  period: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 16,
    color: C.fgHeading,
  },
});
