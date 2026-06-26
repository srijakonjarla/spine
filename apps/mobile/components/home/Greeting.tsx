import { Text, View } from "react-native";
import { formatGreetingDate } from "@spine/shared";
import { FlameIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";
import { homeStyles as s } from "./styles";

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 18) return "good afternoon";
  return "good evening";
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
  const showStats = streakDays > 0 || pagesToday > 0;
  return (
    <View>
      <Text style={s.dateLine}>{formatGreetingDate()}</Text>
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
