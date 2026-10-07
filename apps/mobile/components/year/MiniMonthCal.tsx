import { Pressable, StyleSheet, Text, View } from "react-native";
import { MONTH_NAMES, buildMonthCells, monthKey } from "@spine/shared";
import { C, RGB, alpha } from "@/components/login/tokens";

export function MiniMonthCal({
  year,
  monthIndex,
  loggedDates,
  finishedDates,
  todayStr,
  isCurrentYear,
  width,
  onPress,
}: {
  year: number;
  monthIndex: number;
  loggedDates: Set<string>;
  finishedDates: Set<string>;
  todayStr: string;
  isCurrentYear: boolean;
  width: number;
  onPress: () => void;
}) {
  const key = monthKey(year, monthIndex);
  const cells = buildMonthCells(year, monthIndex);
  const isThisMonth = todayStr.startsWith(key);
  const isFutureMonth = isCurrentYear && `${key}-01` > todayStr;

  let booksThisMonth = 0;
  finishedDates.forEach((d) => {
    if (d.startsWith(key)) booksThisMonth++;
  });
  let daysLogged = 0;
  loggedDates.forEach((d) => {
    if (d.startsWith(key)) daysLogged++;
  });

  const inner = width - 16;
  const cellGap = 2;
  const cell = Math.floor((inner - cellGap * 6) / 7);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { width },
        isThisMonth && s.cardThisMonth,
        isFutureMonth && { opacity: 0.45 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={s.head}>
        <Text style={s.name}>{MONTH_NAMES[monthIndex].slice(0, 3)}</Text>
        {booksThisMonth > 0 ? (
          <Text style={s.books}>
            {booksThisMonth} {booksThisMonth === 1 ? "book" : "books"}
          </Text>
        ) : null}
      </View>
      {isFutureMonth ? (
        <Text style={s.hand}>not yet written</Text>
      ) : (
        <View style={[s.grid, { gap: cellGap }]}>
          {cells.map((c, i) => {
            if (c.day == null)
              return <View key={i} style={{ width: cell, height: cell }} />;
            const isFuture = isCurrentYear && c.dateStr > todayStr;
            const bg =
              c.dateStr === todayStr
                ? C.plum
                : finishedDates.has(c.dateStr)
                  ? alpha(RGB.terra, 0.7)
                  : loggedDates.has(c.dateStr)
                    ? alpha(RGB.sage, 0.5)
                    : isFuture
                      ? alpha(RGB.plum, 0.03)
                      : alpha(RGB.plum, 0.07);
            return (
              <View
                key={i}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 2,
                  backgroundColor: bg,
                  opacity: isFuture ? 0.4 : 1,
                }}
              />
            );
          })}
        </View>
      )}
      {!isFutureMonth && daysLogged === 0 && booksThisMonth === 0 ? (
        <Text style={s.hand}>no days logged</Text>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 8,
  },
  cardThisMonth: { borderColor: alpha(RGB.terra, 0.55), borderWidth: 1.5 },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  name: { fontSize: 11, fontWeight: "600", color: C.fgMuted },
  books: { fontSize: 9, color: C.sageDeep },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  hand: {
    fontSize: 10,
    fontStyle: "italic",
    color: C.fgFaint,
    marginTop: 4,
  },
});
