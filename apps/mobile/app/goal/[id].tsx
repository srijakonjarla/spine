import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { finishedInYear, type ReadingGoal } from "@spine/shared";
import { homeStyles as h } from "@/components/home";
import { C, SERIF } from "@/components/login/tokens";
import { BackBar, EmptyHint } from "@/components/ui/ScreenHeader";
import { useAuth } from "@/lib/auth";
import { useBooks } from "@/lib/booksContext";
import {
  addBookToGoal,
  deleteGoal,
  loadGoalsForYear,
  removeBookFromGoal,
  updateGoal,
} from "@/lib/goals";

export default function GoalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; year: string }>();
  const year = Number(params.year) || new Date().getFullYear();
  const { session } = useAuth();
  const { books } = useBooks();
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadGoalsForYear(year)
      .then((gs) => {
        const g = gs.find((x) => x.id === params.id) ?? null;
        setGoal(g);
        if (g) {
          setName(g.name);
          setTarget(String(g.target));
        }
      })
      .catch(() => setGoal(null))
      .finally(() => setLoading(false));
  }, [params.id, year]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const finished = useMemo(() => finishedInYear(books, year), [books, year]);

  const scheduleSave = (patch: { target?: number; name?: string }) => {
    if (!goal) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () =>
        updateGoal(goal.id, patch).catch(() =>
          Alert.alert("couldn't save goal", "try again later."),
        ),
      600,
    );
  };

  if (loading || !goal) {
    return (
      <SafeAreaView style={h.safe} edges={["top"]}>
        <BackBar label="goals" />
        <View style={h.scrollContent}>
          {loading ? (
            <ActivityIndicator color={C.fgMuted} style={{ marginTop: 40 }} />
          ) : (
            <EmptyHint>that goal doesn&apos;t exist anymore.</EmptyHint>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const targetNum = Number(target) || goal.target;
  const pinned = books.filter((b) => goal.bookIds.includes(b.id));
  const current = goal.isAuto ? finished.length : pinned.length;
  const pct =
    targetNum > 0 ? Math.min(100, Math.round((current / targetNum) * 100)) : 0;
  const q = search.trim().toLowerCase();
  const eligible = books
    .filter(
      (b) =>
        !goal.bookIds.includes(b.id) &&
        (!q ||
          b.title.toLowerCase().includes(q) ||
          (b.author ?? "").toLowerCase().includes(q)),
    )
    .slice(0, 12);

  const handleAdd = async (bookId: string) => {
    if (busy || !session) return;
    setBusy(bookId);
    try {
      await addBookToGoal({ userId: session.user.id, goalId: goal.id, bookId });
      setGoal({ ...goal, bookIds: [...goal.bookIds, bookId] });
      setSearch("");
    } catch {
      Alert.alert("couldn't add book", "try again later.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (bookId: string) => {
    if (busy) return;
    setBusy(bookId);
    try {
      await removeBookFromGoal({ goalId: goal.id, bookId });
      setGoal({ ...goal, bookIds: goal.bookIds.filter((x) => x !== bookId) });
    } catch {
      Alert.alert("couldn't remove book", "try again later.");
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () =>
    Alert.alert("delete goal", "delete this goal?", [
      { text: "cancel", style: "cancel" },
      {
        text: "delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal(goal.id);
            router.back();
          } catch {
            Alert.alert("couldn't delete goal", "try again later.");
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={h.safe} edges={["top"]}>
      <BackBar label="goals" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={h.scroll}
          contentContainerStyle={h.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.eyebrow}>
            {year} · {goal.isAuto ? "reading goal" : "custom goal"}
          </Text>
          {goal.isAuto ? (
            <Text style={s.title}>{goal.name || `${year} reading goal`}</Text>
          ) : (
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                scheduleSave({ name: v });
              }}
              placeholder="goal name"
              placeholderTextColor={C.fgFaint}
              style={[s.title, { padding: 0 }]}
            />
          )}

          <View style={s.targetRow}>
            <Text style={s.big}>{current}</Text>
            <Text style={s.of}>of</Text>
            <TextInput
              value={target}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, "");
                setTarget(digits);
                const n = Number(digits);
                if (n > 0) scheduleSave({ target: n });
              }}
              keyboardType="number-pad"
              style={s.targetInput}
            />
            <Text style={s.of}>books · {pct}%</Text>
          </View>
          <View style={s.track}>
            <View
              style={[
                s.fill,
                {
                  width: `${pct}%`,
                  backgroundColor: goal.isAuto ? C.terra : C.sage,
                },
              ]}
            />
          </View>
          <Text style={s.hint}>
            {goal.isAuto
              ? "counts every book you finish this year. tap the target to change it."
              : "counts the books you pin below. tap the target to change it."}
          </Text>

          {!goal.isAuto ? (
            <View style={{ marginTop: 28 }}>
              <Text style={s.label}>books in this goal</Text>
              {pinned.length === 0 ? (
                <EmptyHint>no books pinned yet.</EmptyHint>
              ) : (
                pinned.map((b) => (
                  <View key={b.id} style={s.row}>
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => router.push(`/book/${b.id}`)}
                    >
                      <Text style={s.rowTitle} numberOfLines={1}>
                        {b.status === "finished" ? "✓ " : "· "}
                        {b.title}
                      </Text>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      disabled={busy === b.id}
                      onPress={() => handleRemove(b.id)}
                    >
                      <Text style={s.remove}>×</Text>
                    </Pressable>
                  </View>
                ))
              )}

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="search your library to add…"
                placeholderTextColor={C.fgFaint}
                style={s.search}
              />
              {q
                ? eligible.map((b) => (
                    <Pressable
                      key={b.id}
                      disabled={busy === b.id}
                      onPress={() => handleAdd(b.id)}
                      style={({ pressed }) => [
                        s.row,
                        pressed && { backgroundColor: C.paperDeep },
                      ]}
                    >
                      <Text style={s.rowTitle} numberOfLines={1}>
                        + {b.title}
                      </Text>
                      {b.author ? (
                        <Text style={s.rowAuthor} numberOfLines={1}>
                          {b.author}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))
                : null}
            </View>
          ) : null}

          <Pressable
            hitSlop={8}
            onPress={confirmDelete}
            style={{ marginTop: 36 }}
          >
            <Text style={s.danger}>delete goal</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.fgFaint,
    marginBottom: 6,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 28,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -0.8,
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 20,
  },
  big: { fontFamily: SERIF, fontSize: 40, fontWeight: "700", color: C.plum },
  of: { fontSize: 14, color: C.fgMuted },
  targetInput: {
    fontFamily: SERIF,
    fontSize: 24,
    fontWeight: "700",
    color: C.plum,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    minWidth: 44,
    textAlign: "center",
    paddingVertical: 0,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.paperDeep,
    overflow: "hidden",
    marginTop: 12,
  },
  fill: { height: "100%", borderRadius: 4 },
  hint: { fontSize: 12, color: C.fgFaint, marginTop: 8 },
  label: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.fgMuted,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  rowTitle: { flex: 1, fontSize: 14, color: C.fg },
  rowAuthor: { fontSize: 11, color: C.fgFaint, maxWidth: "40%" },
  remove: { fontSize: 18, color: C.fgFaint, paddingHorizontal: 4 },
  search: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 8,
    fontSize: 14,
    color: C.fg,
    marginTop: 16,
  },
  danger: { fontSize: 13, color: C.danger },
});
