import { useEffect, useState } from "react";
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
import { homeStyles as h } from "@/components/home";
import { C } from "@/components/login/tokens";
import { BackBar, EmptyHint, ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  createRecommendation,
  deleteRecommendation,
  getRecommendations,
  type Recommendation,
} from "@/lib/recommendations";

type Direction = Recommendation["direction"];

function monthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function RecommendationsScreen() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [direction, setDirection] = useState<Direction>("incoming");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [by, setBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRecommendations()
      .then(setRecs)
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setBy("");
    setNotes("");
    setShowAdd(false);
  };

  const handleAdd = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createRecommendation({
        title: title.trim(),
        author: author.trim(),
        recommendedBy: by.trim(),
        notes: notes.trim(),
        direction,
      });
      setRecs((prev) => [created, ...prev]);
      resetForm();
    } catch {
      Alert.alert("couldn't save recommendation", "try again later.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (rec: Recommendation) => {
    Alert.alert("remove recommendation", `remove "${rec.title}"?`, [
      { text: "cancel", style: "cancel" },
      {
        text: "remove",
        style: "destructive",
        onPress: async () => {
          const prev = recs;
          setRecs((r) => r.filter((x) => x.id !== rec.id));
          try {
            await deleteRecommendation(rec.id);
          } catch {
            setRecs(prev);
            Alert.alert("couldn't remove recommendation", "try again later.");
          }
        },
      },
    ]);
  };

  const incoming = recs.filter((r) => r.direction === "incoming");
  const outgoing = recs.filter((r) => r.direction === "outgoing");

  const renderRec = (rec: Recommendation) => (
    <Pressable
      key={rec.id}
      onLongPress={() => confirmDelete(rec)}
      style={({ pressed }) => [s.rec, pressed && { opacity: 0.7 }]}
    >
      <Text style={s.recTitle} numberOfLines={2}>
        {rec.title}
      </Text>
      <Text style={s.recMeta}>
        {[
          rec.author,
          rec.recommendedBy
            ? `${rec.direction === "incoming" ? "by" : "to"} ${rec.recommendedBy}`
            : null,
          monthYear(rec.createdAt),
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      {rec.notes ? <Text style={s.recNotes}>{rec.notes}</Text> : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={h.safe} edges={["top"]}>
      <BackBar label="library" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={h.scroll}
          contentContainerStyle={h.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="recommendations"
            subtitle={
              loading
                ? undefined
                : `${incoming.length} received · ${outgoing.length} given`
            }
          />

          {showAdd ? (
            <View style={s.form}>
              <View style={s.dirRow}>
                {(["incoming", "outgoing"] as const).map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDirection(d)}
                    style={[s.dirChip, direction === d && s.dirChipActive]}
                  >
                    <Text
                      style={[s.dirText, direction === d && s.dirTextActive]}
                    >
                      {d === "incoming"
                        ? "recommended to me"
                        : "recommended by me"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="book title"
                placeholderTextColor={C.fgFaint}
                autoFocus
                style={s.input}
              />
              <TextInput
                value={author}
                onChangeText={setAuthor}
                placeholder="author"
                placeholderTextColor={C.fgFaint}
                style={s.input}
              />
              <TextInput
                value={by}
                onChangeText={setBy}
                placeholder={
                  direction === "incoming"
                    ? "recommended by…"
                    : "recommended to…"
                }
                placeholderTextColor={C.fgFaint}
                style={s.input}
              />
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="context, why it was recommended…"
                placeholderTextColor={C.fgFaint}
                style={s.input}
                multiline
              />
              <View style={s.formActions}>
                <Pressable
                  onPress={handleAdd}
                  disabled={!title.trim() || saving}
                  style={[
                    s.primary,
                    (!title.trim() || saving) && { opacity: 0.5 },
                  ]}
                >
                  <Text style={s.primaryText}>
                    {saving ? "saving…" : "log recommendation"}
                  </Text>
                </Pressable>
                <Pressable onPress={resetForm}>
                  <Text style={s.cancel}>cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : !loading ? (
            <Pressable hitSlop={8} onPress={() => setShowAdd(true)}>
              <Text style={s.addLink}>+ log recommendation</Text>
            </Pressable>
          ) : null}

          {loading ? (
            <ActivityIndicator color={C.fgMuted} style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={s.error}>couldn&apos;t load. {error}</Text>
          ) : recs.length === 0 && !showAdd ? (
            <EmptyHint>no recommendations logged yet.</EmptyHint>
          ) : (
            <>
              {incoming.length > 0 ? (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>recommended to me</Text>
                  {incoming.map(renderRec)}
                </View>
              ) : null}
              {outgoing.length > 0 ? (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>recommended by me</Text>
                  {outgoing.map(renderRec)}
                </View>
              ) : null}
              {recs.length > 0 ? (
                <Text style={s.hint}>long-press to remove.</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  error: { color: C.danger, paddingVertical: 16 },
  addLink: { fontSize: 13, color: C.fgMuted, marginBottom: 22 },
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.fgMuted,
    marginBottom: 8,
  },
  rec: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  recTitle: { fontSize: 15, fontWeight: "500", color: C.fg },
  recMeta: { fontSize: 12, color: C.fgMuted, marginTop: 2 },
  recNotes: {
    fontSize: 12,
    fontStyle: "italic",
    color: C.fgFaint,
    marginTop: 4,
  },
  hint: { fontSize: 11, color: C.fgFaint, textAlign: "center" },
  form: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 22,
  },
  dirRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dirChip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dirChipActive: { backgroundColor: C.plum, borderColor: C.plum },
  dirText: { fontSize: 12, color: C.fgMuted },
  dirTextActive: { color: C.white },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 8,
    fontSize: 15,
    color: C.fg,
  },
  formActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  primary: {
    backgroundColor: C.plum,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  primaryText: { color: C.white, fontSize: 13, fontWeight: "600" },
  cancel: { fontSize: 13, color: C.fgFaint },
});
