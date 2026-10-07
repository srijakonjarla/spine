import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { BookEntry } from "@spine/shared";
import { C, RGB, SERIF, alpha } from "@/components/login/tokens";

// Year-in-review primitives — mobile counterparts of web's components/review.

export function ReviewSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

export function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <View style={s.tile}>
      <View style={[s.tileAccent, { backgroundColor: accent }]} />
      <Text style={s.tileValue}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

export function Bar({
  value,
  color = C.terra,
  height = 6,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  return (
    <View style={[s.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height: "100%",
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function BarList({
  items,
  color,
}: {
  items: [string, number][];
  color?: string;
}) {
  const max = items[0]?.[1] || 1;
  return (
    <View style={{ gap: 10 }}>
      {items.map(([label, count]) => (
        <View key={label}>
          <View style={s.barHead}>
            <Text style={s.barLabel} numberOfLines={1}>
              {label}
            </Text>
            <Text style={s.barCount}>{count}</Text>
          </View>
          <Bar value={count / max} color={color} />
        </View>
      ))}
    </View>
  );
}

export function MonthlyChart({
  months,
}: {
  months: { key: string; label: string; count: number }[];
}) {
  const max = Math.max(...months.map((m) => m.count), 1);
  return (
    <View style={s.chart}>
      {months.map((m) => (
        <View key={m.key} style={s.chartCol}>
          {m.count > 0 ? <Text style={s.chartCount}>{m.count}</Text> : null}
          <View
            style={[
              s.chartBar,
              m.count > 0
                ? { height: `${Math.round((m.count / max) * 80)}%` }
                : { height: 2, backgroundColor: C.line },
            ]}
          />
          <Text style={s.chartLabel}>{m.label.slice(0, 1)}</Text>
        </View>
      ))}
    </View>
  );
}

export function RatingRow({
  label,
  count,
  max,
  color = C.gold,
}: {
  label: string;
  count: number;
  max: number;
  color?: string;
}) {
  return (
    <View style={s.ratingRow}>
      <Text style={s.ratingLabel}>{label}</Text>
      <View style={{ flex: 1 }}>
        <Bar value={max > 0 ? count / max : 0} color={color} height={14} />
      </View>
      <Text style={s.ratingCount}>{count}</Text>
    </View>
  );
}

export function ReviewBookRow({
  book,
  meta,
}: {
  book: BookEntry;
  meta?: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/book/${book.id}`)}
      style={({ pressed }) => [s.bookRow, pressed && { opacity: 0.6 }]}
    >
      <Text style={s.bookTitle} numberOfLines={1}>
        {book.title}
      </Text>
      {meta ? <Text style={s.bookMeta}>{meta}</Text> : null}
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

export const reviewStyles = StyleSheet.create({
  cardLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.fgFaint,
    marginBottom: 6,
  },
  small: { fontSize: 11, color: C.fgFaint, marginTop: 6 },
  serif: { fontFamily: SERIF },
});

const s = StyleSheet.create({
  section: { marginBottom: 36 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.fgMuted,
    marginBottom: 14,
  },
  tile: {
    width: "48%",
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
    overflow: "hidden",
  },
  tileAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  tileValue: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: "700",
    color: C.plum,
  },
  tileLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.fgMuted,
    marginTop: 2,
  },
  track: { backgroundColor: alpha(RGB.plum, 0.07), overflow: "hidden" },
  barHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
    gap: 8,
  },
  barLabel: { flex: 1, fontSize: 12, color: C.fg },
  barCount: { fontSize: 12, color: C.fgFaint },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 5, height: 120 },
  chartCol: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
  },
  chartCount: { fontSize: 9, color: C.fgMuted },
  chartBar: {
    width: "100%",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: C.terra,
  },
  chartLabel: { fontSize: 10, color: C.fgFaint },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingLabel: {
    width: 28,
    textAlign: "right",
    fontSize: 11,
    color: C.fgFaint,
  },
  ratingCount: { width: 20, fontSize: 11, color: C.fgFaint },
  bookRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingVertical: 6,
  },
  bookTitle: { flex: 1, fontSize: 14, fontWeight: "500", color: C.fg },
  bookMeta: { fontSize: 11, color: C.fgFaint },
  card: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
});
