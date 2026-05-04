import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, homeStyles as s } from "@/components/home";
import { useAuth } from "@/lib/auth";
import { loadGoals, type GoalListItem } from "@/lib/goals";
import { C } from "@/components/login/tokens";

const SAGE = "#7b9e87";

function GoalCard({ goal }: { goal: GoalListItem }) {
  const current = goal.isAuto ? goal.yearFinished : goal.pinnedFinished;
  const total = goal.target || (goal.pinnedBookIds.length || 0);
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const accent = goal.isAuto ? C.terraInk : SAGE;
  const caveat =
    pct >= 100
      ? "goal reached"
      : pct >= 75
        ? "almost there"
        : pct >= 50
          ? "halfway there"
          : pct > 0
            ? "keep reading"
            : "not started yet";

  return (
    <View style={[s.statCard, { minHeight: 0, marginBottom: 12 }]}>
      <View style={[s.statTopBorder, { backgroundColor: accent }]} />
      <Text style={s.statLabel}>
        {goal.year} {goal.isAuto ? "auto goal" : goal.name.toLowerCase()}
      </Text>
      <Text style={s.statBig}>
        {current}{" "}
        <Text style={s.statBigSecondary}>/ {total || "—"}</Text>
      </Text>
      <Text style={s.statSub}>
        {goal.isAuto ? "books finished this year" : "pinned books finished"}
      </Text>
      <View style={[s.progressBar, { marginTop: 10 }]}>
        <View
          style={[
            s.progressFill,
            { width: `${pct}%`, backgroundColor: accent },
          ]}
        />
      </View>
      <Text style={s.statCaveat}>{caveat}</Text>
    </View>
  );
}

export default function GoalsTab() {
  const { session } = useAuth();
  const [goals, setGoals] = useState<GoalListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    loadGoals()
      .then((g) => {
        if (!cancelled) setGoals(g);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <TopBar />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.dateLine}>your reading goals</Text>
        <Text style={[s.greeting, { fontSize: 32, lineHeight: 36 }]}>
          how it&apos;s going.
        </Text>
        <View style={{ marginBottom: 22 }} />

        {loading && (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={C.fgMuted} />
          </View>
        )}

        {!loading && error && (
          <Text style={{ color: "#b03a2e", paddingVertical: 16 }}>
            couldn&apos;t load goals. {error}
          </Text>
        )}

        {!loading && !error && goals && goals.length === 0 && (
          <Text style={s.sectionHand}>
            no goals yet — set one for the year and we&apos;ll track it here.
          </Text>
        )}

        {!loading && !error && goals && goals.length > 0 && (
          <>
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
