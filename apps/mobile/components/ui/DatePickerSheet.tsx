import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  MONTH_NAMES,
  buildMonthCells,
  localDateStr,
  parseLocalDate,
  stepMonth,
} from "@spine/shared";
import { SheetModal, sheetStyles as m } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Month-grid date picker in a bottom sheet. Pure JS so it ships without a
 * native rebuild. `min` / `max` are inclusive "YYYY-MM-DD" bounds.
 */
export function DatePickerSheet({
  open,
  title,
  value,
  min,
  max,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  value: string;
  min?: string;
  max?: string;
  onClose: () => void;
  onPick: (date: string) => void;
}) {
  const initial =
    parseLocalDate(value) ?? parseLocalDate(max ?? "") ?? new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [monthIndex, setMonthIndex] = useState(initial.getMonth());

  // Re-center on the current value each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    const d = parseLocalDate(value) ?? parseLocalDate(max ?? "") ?? new Date();
    setYear(d.getFullYear());
    setMonthIndex(d.getMonth());
  }, [open, value, max]);

  const step = (delta: number) => {
    const next = stepMonth(year, monthIndex, delta);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
  };

  const today = localDateStr();
  const cells = buildMonthCells(year, monthIndex);
  const inRange = (d: string) => (!min || d >= min) && (!max || d <= max);

  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={m.title}>{title}</Text>
      <View style={s.nav}>
        <Pressable hitSlop={10} onPress={() => step(-1)}>
          <Text style={s.arrow}>‹</Text>
        </Pressable>
        <Text style={s.month}>
          {MONTH_NAMES[monthIndex]} {year}
        </Text>
        <Pressable hitSlop={10} onPress={() => step(1)}>
          <Text style={s.arrow}>›</Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {WEEKDAYS.map((w, i) => (
          <View key={`w${i}`} style={s.cell}>
            <Text style={s.weekday}>{w}</Text>
          </View>
        ))}
        {cells.map((c, i) => {
          if (c.day == null) return <View key={i} style={s.cell} />;
          const enabled = inRange(c.dateStr);
          const selected = c.dateStr === value;
          return (
            <Pressable
              key={i}
              disabled={!enabled}
              onPress={() => {
                onPick(c.dateStr);
                onClose();
              }}
              style={s.cell}
            >
              <View
                style={[
                  s.dayInner,
                  c.dateStr === today && s.today,
                  selected && s.selected,
                ]}
              >
                <Text
                  style={[
                    s.day,
                    !enabled && { color: C.fgFaint, opacity: 0.4 },
                    selected && { color: C.white, fontWeight: "700" },
                  ]}
                >
                  {c.day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={m.actionsRow}>
        {max && max >= today && (!min || today >= min) ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              onPick(today);
              onClose();
            }}
            style={m.cancelBtn}
          >
            <Text style={m.cancelText}>today</Text>
          </Pressable>
        ) : null}
        <Pressable hitSlop={8} onPress={onClose} style={m.cancelBtn}>
          <Text style={m.cancelText}>cancel</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}

const s = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  arrow: { fontSize: 26, color: C.plum, paddingHorizontal: 8 },
  month: { fontSize: 15, fontWeight: "600", color: C.fgHeading },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekday: { fontSize: 11, color: C.fgFaint, fontWeight: "600" },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  today: { borderWidth: 1, borderColor: C.terra },
  selected: { backgroundColor: C.plum, borderColor: C.plum },
  day: { fontSize: 15, color: C.fg },
});
