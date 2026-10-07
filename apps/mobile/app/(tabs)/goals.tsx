import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { TopBar, homeStyles as s } from "@/components/home";
import { useAuth } from "@/lib/auth";
import { loadGoals, setGoal, type GoalListItem } from "@/lib/goals";
import {
  GoalCreateModal,
  type NewGoalDraft,
} from "@/components/goals/GoalCreateModal";
import { C } from "@/components/login/tokens";

const CURRENT_YEAR = new Date().getFullYear();

function GoalCard({ goal }: { goal: GoalListItem }) {
  const router = useRouter();
  const current = goal.isAuto ? goal.yearFinished : goal.pinnedFinished;
  const total = goal.target || goal.pinnedBookIds.length || 0;
  const pct =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const accent = goal.isAuto ? C.terraInk : C.sage;
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
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/goal/[id]",
          params: { id: goal.id, year: String(goal.year) },
        })
      }
      style={({ pressed }) => [
        s.statCard,
        { minHeight: 0, marginBottom: 12 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[s.statTopBorder, { backgroundColor: accent }]} />
      <Text style={s.statLabel}>
        {goal.year} {goal.isAuto ? "reading goal" : goal.name.toLowerCase()}
      </Text>
      <Text style={s.statBig}>
        {current} <Text style={s.statBigSecondary}>/ {total || "—"}</Text>
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
    </Pressable>
  );
}

export default function GoalsTab() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [goals, setGoals] = useState<GoalListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    return loadGoals()
      .then(setGoals)
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"));
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    loadGoals()
      .then((g) => {
        if (!cancelled) setGoals(g);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Pick up edits made on the goal detail screen.
  useFocusEffect(
    useCallback(() => {
      if (session) void refresh();
    }, [session, refresh]),
  );

  const hasYearly = !!goals?.some((g) => g.isAuto && g.year === CURRENT_YEAR);

  const handleCreate = async (draft: NewGoalDraft) => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await setGoal({
        userId,
        year: CURRENT_YEAR,
        target: draft.target,
        name: draft.name,
        isAuto: draft.isAuto,
      });
      await refresh();
      setShowForm(false);
    } catch (e) {
      Alert.alert(
        "couldn't set goal",
        e instanceof Error ? e.message : "try again later.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <TopBar />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={local.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.dateLine}>your reading goals</Text>
            <Text style={[s.greeting, { fontSize: 32, lineHeight: 36 }]}>
              how it&apos;s going.
            </Text>
          </View>
          <Pressable
            onPress={() => setShowForm(true)}
            style={({ pressed }) => [
              local.newBtn,
              pressed && { backgroundColor: C.plumGlow },
            ]}
          >
            <Text style={local.newBtnText}>+ new goal</Text>
          </Pressable>
        </View>
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
          <Pressable onPress={() => setShowForm(true)} style={local.emptyCard}>
            <Text style={local.emptyPlus}>＋</Text>
            <Text style={s.sectionHand}>
              no goals yet — set one for the year.
            </Text>
          </Pressable>
        )}

        {!loading && !error && goals && goals.length > 0 && (
          <>
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </>
        )}
      </ScrollView>

      <GoalCreateModal
        open={showForm}
        year={CURRENT_YEAR}
        saving={saving}
        hasYearly={hasYearly}
        onClose={() => setShowForm(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  newBtn: {
    backgroundColor: C.plum,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  newBtnText: {
    color: C.cream,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  emptyCard: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: C.line,
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyPlus: { fontSize: 28, color: C.fgFaint, lineHeight: 30 },
});
