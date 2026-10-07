import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  localDateStr,
  type BookEntry,
  type ReadingStatus,
  type Thought,
} from "@spine/shared";
import { DetailsTab, type PastReadDraft } from "@/components/book/DetailsTab";
import { Hero } from "@/components/book/Hero";
import { QuotesTab } from "@/components/book/QuotesTab";
import { ReflectionTab } from "@/components/book/ReflectionTab";
import { TabStrip, type TabId } from "@/components/book/TabStrip";
import { TimelineTab } from "@/components/book/TimelineTab";
import { C } from "@/components/login/tokens";
import { useBooks } from "@/lib/booksContext";
import {
  deleteEntry,
  deleteRead,
  getEntry,
  logPastRead,
  startNewRead,
  updateEntry,
} from "@/lib/library";

export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, updateBook, removeBook } = useBooks();

  const cached = useMemo(() => books.find((b) => b.id === id), [books, id]);
  const [entry, setEntry] = useState<BookEntry | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("reflection");
  const [rereadLoading, setRereadLoading] = useState(false);

  // Always refetch with nested data — cached entry is missing thoughts/reads.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getEntry(id)
      .then((data) => {
        if (cancelled) return;
        if (data) setEntry(data);
        else setError("not found");
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
  }, [id]);

  const patch = useCallback(
    async (p: Partial<BookEntry>) => {
      if (!entry) return;
      const next = { ...entry, ...p };
      setEntry(next);
      updateBook(entry.id, p);
      try {
        await updateEntry(entry.id, p);
      } catch {
        setEntry(entry);
        updateBook(entry.id, entry);
      }
    },
    [entry, updateBook],
  );

  // Same date rules as web: stamp the transition date the first time.
  const handleStatusChange = useCallback(
    (status: ReadingStatus) => {
      if (!entry) return;
      const p: Partial<BookEntry> = { status };
      const today = localDateStr();
      if (status === "reading" && !entry.dateStarted) p.dateStarted = today;
      if (status === "finished" && !entry.dateFinished) p.dateFinished = today;
      if (status === "did-not-finish" && !entry.dateDnfed) p.dateDnfed = today;
      void patch(p);
    },
    [entry, patch],
  );

  const handleReread = useCallback(async () => {
    if (!entry || rereadLoading) return;
    setRereadLoading(true);
    try {
      await startNewRead(entry);
      const refreshed = await getEntry(entry.id);
      if (refreshed) {
        setEntry(refreshed);
        updateBook(entry.id, {
          status: refreshed.status,
          dateStarted: refreshed.dateStarted,
          dateFinished: refreshed.dateFinished,
          dateShelved: refreshed.dateShelved,
          dateDnfed: refreshed.dateDnfed,
          rating: refreshed.rating,
          feeling: refreshed.feeling,
          reads: refreshed.reads,
        });
      }
    } catch {
      Alert.alert("couldn't start a re-read", "try again later.");
    } finally {
      setRereadLoading(false);
    }
  }, [entry, rereadLoading, updateBook]);

  const handleLogRead = useCallback(
    async (draft: PastReadDraft) => {
      if (!entry) return;
      const read = await logPastRead(entry.id, draft);
      const reads = [...entry.reads, read];
      setEntry({ ...entry, reads });
      updateBook(entry.id, { reads });
    },
    [entry, updateBook],
  );

  const handleDeleteRead = useCallback(
    async (readId: string) => {
      if (!entry) return;
      await deleteRead(entry.id, readId);
      const reads = entry.reads.filter((r) => r.id !== readId);
      setEntry({ ...entry, reads });
      updateBook(entry.id, { reads });
    },
    [entry, updateBook],
  );

  const handleDelete = useCallback(async () => {
    if (!entry) return;
    try {
      await deleteEntry(entry.id);
      removeBook(entry.id);
      router.back();
    } catch {
      Alert.alert("couldn't delete entry", "try again later.");
    }
  }, [entry, removeBook, router]);

  const handleThoughtsChange = useCallback(
    (update: (prev: Thought[]) => Thought[]) =>
      setEntry((prev) =>
        prev ? { ...prev, thoughts: update(prev.thoughts) } : prev,
      ),
    [],
  );

  // Keep the shared books cache in step so home's progress and pages-today
  // reflect added/deleted notes without a refetch.
  const thoughts = entry?.thoughts;
  useEffect(() => {
    if (id && thoughts) updateBook(id, { thoughts });
  }, [id, thoughts, updateBook]);

  if (loading || !entry) {
    return (
      <SafeAreaView style={s.shell} edges={["top"]}>
        <View style={s.topBar}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Text style={s.back}>←</Text>
          </Pressable>
        </View>
        <View style={s.centerFill}>
          {error ? (
            <Text style={s.error}>{error}</Text>
          ) : (
            <ActivityIndicator color={C.fgMuted} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.shell} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <Hero
          entry={entry}
          onBack={() => router.back()}
          onPatch={patch}
          onStatusChange={handleStatusChange}
          onReread={handleReread}
          rereadLoading={rereadLoading}
        />
        <TabStrip tab={tab} setTab={setTab} />
        <View style={s.tabBody}>
          {tab === "reflection" ? (
            <ReflectionTab entry={entry} onPatch={patch} />
          ) : tab === "details" ? (
            <DetailsTab
              entry={entry}
              onPatch={patch}
              onLogRead={handleLogRead}
              onDeleteRead={handleDeleteRead}
              onDelete={handleDelete}
            />
          ) : tab === "timeline" ? (
            <TimelineTab
              entry={entry}
              onThoughtsChange={handleThoughtsChange}
            />
          ) : (
            <QuotesTab bookId={entry.id} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.cream },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  back: { fontSize: 13, color: C.fgMuted },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#b03a2e", fontSize: 14 },
  tabBody: { paddingHorizontal: 20, paddingTop: 18 },
});
