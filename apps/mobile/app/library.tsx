import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReadingStatus } from "@spine/shared/types";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type BookRow = {
  id: string;
  status: ReadingStatus;
  title: string;
  author: string;
  cover_url: string | null;
};

type UserBookResult = {
  id: string;
  status: ReadingStatus;
  title_override: string | null;
  author_override: string | null;
  catalog_books: {
    title: string;
    author: string;
    cover_url: string | null;
  } | null;
};

export default function Library() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("user_books")
        .select(
          "id, status, title_override, author_override, catalog_books ( title, author, cover_url )",
        )
        .order("updated_at", { ascending: false });
      if (error) {
        setError(error.message);
        return;
      }
      const rows = (data ?? []) as unknown as UserBookResult[];
      setBooks(
        rows.map((r) => ({
          id: r.id,
          status: r.status,
          title: r.title_override || r.catalog_books?.title || "Untitled",
          author: r.author_override || r.catalog_books?.author || "",
          cover_url: r.catalog_books?.cover_url || null,
        })),
      );
    })();
  }, [session, router]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (!books && !error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Pressable onPress={handleSignOut}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>Error: {error}</Text>
        </View>
      ) : (
        <FlatList
          data={books ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No books yet. Add one from the web app.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]} />
              )}
              <View style={styles.meta}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.author} numberOfLines={1}>
                  {item.author}
                </Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  link: { color: "#666", fontSize: 14 },
  list: { padding: 16, gap: 14 },
  row: { flexDirection: "row", gap: 14 },
  cover: { width: 60, height: 90, borderRadius: 4, backgroundColor: "#f2f2f2" },
  coverPlaceholder: { backgroundColor: "#eee" },
  meta: { flex: 1, justifyContent: "center", gap: 4 },
  bookTitle: { fontSize: 16, fontWeight: "600" },
  author: { fontSize: 14, color: "#666" },
  status: { fontSize: 12, color: "#999", textTransform: "capitalize" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  error: { color: "#c00", padding: 20, textAlign: "center" },
});
