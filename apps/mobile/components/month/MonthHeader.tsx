import { Pressable, Text, View } from "react-native";
import { formatMonthYear } from "@spine/shared";
import { monthStyles as m } from "./styles";

interface Props {
  year: number;
  monthIndex: number;
  finished: number;
  daysRead: number;
  streak: number;
  quotes: number;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function MonthHeader({
  year,
  monthIndex,
  finished,
  daysRead,
  streak,
  quotes,
  isCurrentMonth,
  onPrev,
  onNext,
  onToday,
}: Props) {
  const monthLabel = formatMonthYear(
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`,
  );

  const parts: string[] = [];
  if (finished > 0) parts.push(`${finished} finished`);
  if (daysRead > 0) parts.push(`${daysRead} days read`);
  if (streak >= 3) parts.push(`${streak}-day streak`);
  if (quotes > 0) parts.push(`${quotes} quotes`);
  const statsLine = parts.join(" · ");

  return (
    <View style={m.headerWrap}>
      <Text style={m.kicker}>reading journal · {year}</Text>
      <Text style={m.title}>{monthLabel}</Text>
      {statsLine ? <Text style={m.stats}>{statsLine}</Text> : null}
      <View style={m.navRow}>
        <Pressable style={m.navBtn} onPress={onPrev}>
          <Text style={m.navBtnText}>← prev</Text>
        </Pressable>
        {!isCurrentMonth ? (
          <Pressable style={m.navTodayBtn} onPress={onToday}>
            <Text style={m.navTodayText}>today</Text>
          </Pressable>
        ) : (
          <View style={m.navTodayBtn} />
        )}
        <Pressable style={m.navBtn} onPress={onNext}>
          <Text style={m.navBtnText}>next →</Text>
        </Pressable>
      </View>
    </View>
  );
}
