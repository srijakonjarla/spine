import { Pressable, Text, View } from "react-native";
import { C } from "@/components/login/tokens";
import { homeStyles as s } from "./styles";

const SAGE = "#7b9e87";

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <View style={s.bars}>
      {values.map((v, i) => {
        const heightPct = Math.max(8, Math.round((v / max) * 100));
        return (
          <View
            key={i}
            style={[
              s.bar,
              s.barActive,
              { height: `${heightPct}%`, opacity: 0.4 + 0.6 * (v / max) },
            ]}
          />
        );
      })}
    </View>
  );
}

export function StatCardsRow({
  streakDays,
  streakHistory,
  streakCaveat,
  goalCurrent,
  goalTarget,
  goalCaveat,
  hasGoal,
  onSetGoal,
  year,
}: {
  streakDays: number;
  streakHistory: number[];
  streakCaveat: string;
  goalCurrent: number;
  goalTarget: number;
  goalCaveat: string;
  hasGoal: boolean;
  onSetGoal?: () => void;
  year: number;
}) {
  const goalPct =
    goalTarget > 0 ? Math.min(100, Math.round((goalCurrent / goalTarget) * 100)) : 0;

  return (
    <View style={s.statRow}>
      <View style={s.statCard}>
        <View style={[s.statTopBorder, { backgroundColor: SAGE }]} />
        <Text style={s.statLabel}>STREAK · {streakDays} DAYS</Text>
        <MiniBars values={streakHistory} />
        <Text style={s.statCaveat}>{streakCaveat}</Text>
      </View>

      {hasGoal ? (
        <View style={s.statCard}>
          <View style={[s.statTopBorder, { backgroundColor: C.terraInk }]} />
          <Text style={s.statLabel}>{year} GOAL</Text>
          <Text style={s.statBig}>
            {goalCurrent}{" "}
            <Text style={s.statBigSecondary}>/ {goalTarget}</Text>
          </Text>
          <Text style={s.statSub}>books finished</Text>
          <View style={[s.progressBar, { marginTop: 10 }]}>
            <View
              style={[
                s.progressFill,
                { width: `${goalPct}%`, backgroundColor: C.terraInk },
              ]}
            />
          </View>
          <Text style={s.statCaveat}>{goalCaveat}</Text>
        </View>
      ) : (
        <Pressable
          onPress={onSetGoal}
          style={({ pressed }) => [
            s.statCard,
            { justifyContent: "center", alignItems: "flex-start" },
            pressed && { backgroundColor: C.paperDeep },
          ]}
        >
          <View style={[s.statTopBorder, { backgroundColor: C.terraInk }]} />
          <Text style={s.statLabel}>{year} GOAL</Text>
          <Text
            style={[s.statBig, { fontSize: 20, lineHeight: 24 }]}
          >
            set a goal
          </Text>
          <Text style={[s.statSub, { marginTop: 6 }]}>
            tap to start tracking
          </Text>
          <Text
            style={[
              s.statCaveat,
              { color: C.terraInk, marginTop: "auto", paddingTop: 8 },
            ]}
          >
            tap me →
          </Text>
        </Pressable>
      )}
    </View>
  );
}
