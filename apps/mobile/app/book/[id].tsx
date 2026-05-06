import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { BookEntry } from "@spine/shared";
import { DetailsTab } from "@/components/book/DetailsTab";
import { Hero } from "@/components/book/Hero";
import { QuotesTab } from "@/components/book/QuotesTab";
import { ReflectionTab } from "@/components/book/ReflectionTab";
import { TabStrip, type TabId } from "@/components/book/TabStrip";
import { TimelineTab } from "@/components/book/TimelineTab";
import { C } from "@/components/login/tokens";
import { useBooks } from "@/lib/booksContext";
import { getEntry, updateEntry } from "@/lib/library";

export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, updateBook } = useBooks();

  const cached = useMemo(() => books.find((b) => b.id === id), [books, id]);
  const [entry, setEntry] = useState<BookEntry | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("reflection");

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
        <Hero entry={entry} onBack={() => router.back()} onPatch={patch} />
        <TabStrip tab={tab} setTab={setTab} />
        <View style={s.tabBody}>
          {tab === "reflection" ? (
            <ReflectionTab entry={entry} onPatch={patch} />
          ) : tab === "details" ? (
            <DetailsTab entry={entry} />
          ) : tab === "timeline" ? (
            <TimelineTab entry={entry} onEntryChange={setEntry} />
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
