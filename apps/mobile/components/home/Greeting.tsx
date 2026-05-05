import { Text, View } from "react-native";
import { FlameIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";
import { homeStyles as s } from "./styles";

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 18) return "good afternoon";
  return "good evening";
}

function formatDateLine(d: Date): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function Greeting({
  name = "reader",
  streakDays = 0,
  pagesToday = 0,
}: {
  name?: string;
  streakDays?: number;
  pagesToday?: number;
}) {
  const date = new Date();
  const showStats = streakDays > 0 || pagesToday > 0;
  return (
    <View>
      <Text style={s.dateLine}>{formatDateLine(date)}</Text>
      <Text style={s.greeting}>
        {timeOfDayGreeting()},{"\n"}
        {name.toLowerCase()}.
      </Text>
      {showStats && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 8,
            marginBottom: 24,
            gap: 8,
          }}
        >
          {streakDays > 0 && <FlameIcon color={C.gold} size={14} />}
          {streakDays > 0 && (
            <Text style={[s.statLine, { marginTop: 0, marginBottom: 0 }]}>
              {streakDays}-day streak
            </Text>
          )}
          {streakDays > 0 && pagesToday > 0 && (
            <Text
              style={[
                s.statLine,
                { marginTop: 0, marginBottom: 0, color: C.fgMuted },
              ]}
            >
              ·
            </Text>
          )}
          {pagesToday > 0 && (
            <Text style={[s.statLine, { marginTop: 0, marginBottom: 0 }]}>
              {pagesToday} pages today
            </Text>
          )}
        </View>
      )}
      {!showStats && <View style={{ marginBottom: 24 }} />}
    </View>
  );
}
