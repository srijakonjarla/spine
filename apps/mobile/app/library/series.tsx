import { useCallback, useEffect, useState } from "react";
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
import type { BookEntry } from "@spine/shared";
import { homeStyles as h } from "@/components/home";
import { SeriesCard } from "@/components/library/SeriesCard";
import { C } from "@/components/login/tokens";
import { BackBar, EmptyHint, ScreenHeader } from "@/components/ui/ScreenHeader";
import { useBooks } from "@/lib/booksContext";
import { createSeries, getSeries, type Series } from "@/lib/series";

export default function SeriesScreen() {
  const { books, updateBook, refresh } = useBooks();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSeries()
      .then(setSeriesList)
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createSeries(newName.trim(), newAuthor.trim());
      setSeriesList((prev) => [created, ...prev]);
      setNewName("");
      setNewAuthor("");
      setShowAdd(false);
    } catch {
      Alert.alert("couldn't create series", "try again later.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = useCallback((next: Series) => {
    setSeriesList((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }, []);

  const handleLibraryUpdate = useCallback(
    (id: string, patch: Partial<BookEntry>) => updateBook(id, patch),
    [updateBook],
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
            title="series tracker"
            subtitle={
              !loading && seriesList.length > 0
                ? `${seriesList.length} series`
                : undefined
            }
          />

          {showAdd ? (
            <View style={s.form}>
              <Text style={s.formLabel}>new series</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="series name — e.g. stormlight archive"
                placeholderTextColor={C.fgFaint}
                autoFocus
                style={s.input}
              />
              <TextInput
                value={newAuthor}
                onChangeText={setNewAuthor}
                placeholder="author"
                placeholderTextColor={C.fgFaint}
                style={s.input}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <View style={s.formActions}>
                <Pressable
                  onPress={handleCreate}
                  disabled={!newName.trim() || saving}
                  style={[
                    s.primary,
                    (!newName.trim() || saving) && { opacity: 0.5 },
                  ]}
                >
                  <Text style={s.primaryText}>
                    {saving ? "saving…" : "add series"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowAdd(false);
                    setNewName("");
                    setNewAuthor("");
                  }}
                >
                  <Text style={s.cancel}>cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : !loading ? (
            <Pressable hitSlop={8} onPress={() => setShowAdd(true)}>
              <Text style={s.addLink}>+ add series</Text>
            </Pressable>
          ) : null}

          {loading ? (
            <ActivityIndicator color={C.fgMuted} style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={s.error}>couldn&apos;t load. {error}</Text>
          ) : seriesList.length === 0 && !showAdd ? (
            <EmptyHint>no series tracked yet.</EmptyHint>
          ) : (
            <View style={{ gap: 14 }}>
              {seriesList.map((series) => (
                <SeriesCard
                  key={series.id}
                  series={series}
                  library={books}
                  onChange={handleChange}
                  onDelete={(id) =>
                    setSeriesList((prev) => prev.filter((x) => x.id !== id))
                  }
                  onBookAdded={refresh}
                  onLibraryBookUpdate={handleLibraryUpdate}
                />
              ))}
              <Text style={s.hint}>
                tap the circle to change status · long-press a book to reorder
                or remove
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  error: { color: C.danger, paddingVertical: 16 },
  addLink: { fontSize: 13, color: C.fgMuted, marginBottom: 18 },
  form: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.fgMuted,
  },
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
  hint: { fontSize: 11, color: C.fgFaint, textAlign: "center", marginTop: 4 },
});
