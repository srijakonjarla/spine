import { Pressable, Text, View } from "react-native";
import { monthStyles as m } from "./styles";

const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export type CalendarCell = { day: number | null; dateStr: string };

interface Props {
  cells: CalendarCell[];
  todayStr: string;
  selectedDate: string | null;
  loggedDates: Set<string>;
  streakDates: Set<string>;
  finishedDates: Set<string>;
  quoteDates: Set<string>;
  noteDates: Set<string>;
  onSelectDate: (date: string) => void;
}

export function MonthCalendar({
  cells,
  todayStr,
  selectedDate,
  loggedDates,
  streakDates,
  finishedDates,
  quoteDates,
  noteDates,
  onSelectDate,
}: Props) {
  return (
    <View style={m.calWrap}>
      <View style={m.weekHeaderRow}>
        {WEEK.map((w, i) => (
          <View key={i} style={m.weekHeaderCell}>
            <Text style={m.weekHeaderText}>{w}</Text>
          </View>
        ))}
      </View>
      <View style={m.grid}>
        {cells.map((c, i) => {
          if (c.day === null) {
            return <View key={i} style={[m.cellWrap, m.cellEmpty]} />;
          }
          const isLogged = loggedDates.has(c.dateStr);
          const isStreak = streakDates.has(c.dateStr);
          const isFinished = finishedDates.has(c.dateStr);
          const hasQuote = quoteDates.has(c.dateStr);
          const hasNote = noteDates.has(c.dateStr);
          const isToday = c.dateStr === todayStr;
          const isSelected = c.dateStr === selectedDate;
          return (
            <View key={i} style={m.cellWrap}>
              <Pressable
                style={[
                  m.cell,
                  isLogged && m.cellLogged,
                  isStreak && m.cellStreak,
                  isFinished && m.cellFinished,
                  isToday && m.cellToday,
                  isSelected && m.cellSelected,
                ]}
                onPress={() => onSelectDate(c.dateStr)}
              >
                <Text
                  style={[
                    m.cellDay,
                    !isLogged && !isFinished && !isSelected && m.cellDayMuted,
                    isSelected && m.cellDayOnDark,
                  ]}
                >
                  {c.day}
                </Text>
                <View style={m.cellMarkRow}>
                  {isFinished && <View style={m.finishedDot} />}
                  {hasQuote && <Text style={m.quoteMark}>✦</Text>}
                  {hasNote && !isFinished && !hasQuote && (
                    <View style={m.noteDot} />
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
