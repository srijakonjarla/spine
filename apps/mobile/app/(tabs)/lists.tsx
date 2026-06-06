import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import type { BookList } from "@spine/shared";
import { TopBar, homeStyles as s } from "@/components/home";
import { C } from "@/components/login/tokens";
import { useAuth } from "@/lib/auth";
import { createList, getLists } from "@/lib/lists";
import { ListCard } from "@/components/lists/ListCard";
import {
  ListCreateModal,
  type NewListDraft,
} from "@/components/lists/ListCreateModal";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export default function ListsTab() {
  const { session } = useAuth();
  const router = useRouter();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [lists, setLists] = useState<BookList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!session) {
      setLists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getLists(year)
      .then(setLists)
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, [session, year]);

  useEffect(load, [load]);

  // Refresh on focus so item counts reflect detail-screen edits.
  useFocusEffect(
    useCallback(() => {
      if (session)
        getLists(year)
          .then(setLists)
          .catch(() => {});
    }, [session, year]),
  );

  const handleCreate = async (draft: NewListDraft) => {
    if (saving) return;
    setSaving(true);
    try {
      const list = await createList(year, draft.name, {
        listType: draft.listType,
        color: draft.color,
        emoji: draft.emoji,
        description: draft.description,
      });
      setLists((prev) => [...prev, list]);
      setShowForm(false);
      router.push(`/list/${list.id}`);
    } catch (e) {
      Alert.alert(
        "couldn't create list",
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
        contentContainerStyle={local.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={local.header}>
          <View>
            <Text style={local.kicker}>reading journal</Text>
            <Text style={local.title}>lists</Text>
            {lists.length > 0 ? (
              <Text style={local.subtitle}>
                {lists.length} collections — make as many as you need
              </Text>
            ) : null}
          </View>
          <View style={local.yearStepper}>
            <Pressable
              hitSlop={8}
              onPress={() => setYear((y) => y - 1)}
              style={local.yearArrow}
            >
              <Text style={local.yearArrowText}>‹</Text>
            </Pressable>
            <Text style={local.yearText}>{year}</Text>
            <Pressable
              hitSlop={8}
              onPress={() => setYear((y) => y + 1)}
              style={local.yearArrow}
            >
              <Text style={local.yearArrowText}>›</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={C.fgMuted} />
          </View>
        ) : error ? (
          <Text style={local.error}>couldn&apos;t load lists. {error}</Text>
        ) : (
          <View style={local.grid}>
            {lists.map((list) => (
              <View key={list.id} style={local.cell}>
                <ListCard
                  list={list}
                  onPress={() => router.push(`/list/${list.id}`)}
                />
              </View>
            ))}
            <View style={local.cell}>
              <Pressable
                onPress={() => setShowForm(true)}
                style={({ pressed }) => [
                  local.createCard,
                  pressed && { borderColor: C.terra, opacity: 0.9 },
                ]}
              >
                <Text style={local.plus}>＋</Text>
                <Text style={local.createLabel}>create a new list</Text>
                <Text style={local.createHint}>
                  books, ideas, bullet points
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <ListCreateModal
        open={showForm}
        saving={saving}
        existingTypes={lists.map((l) => l.listType)}
        onClose={() => setShowForm(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 20,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    color: C.fgMuted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 32,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1.2,
  },
  subtitle: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 14,
    color: C.terraInk,
    marginTop: 4,
    maxWidth: 200,
  },
  yearStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  yearArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
  },
  yearArrowText: {
    fontSize: 16,
    color: C.plum,
    lineHeight: 18,
    fontWeight: "600",
  },
  yearText: {
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: "700",
    color: C.plum,
    minWidth: 44,
    textAlign: "center",
  },
  error: { color: "#b03a2e", paddingVertical: 16 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  cell: { width: "50%", paddingHorizontal: 6, marginBottom: 12 },
  createCard: {
    minHeight: 184,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  plus: { fontSize: 30, color: C.fgFaint, lineHeight: 34 },
  createLabel: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 14,
    color: C.fgMuted,
  },
  createHint: {
    fontSize: 11,
    color: C.fgFaint,
    textAlign: "center",
    lineHeight: 15,
  },
});
