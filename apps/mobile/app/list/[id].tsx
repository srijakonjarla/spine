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
import { useLocalSearchParams, useRouter } from "expo-router";
import { localDateStr, type BookList, type ListItem } from "@spine/shared";
import { C } from "@/components/login/tokens";
import { GradientCover } from "@/components/lists/GradientCover";
import { ListGlyph } from "@/components/lists/listIcons";
import { IDEA_TYPES, listTypeMeta } from "@/components/lists/coverMeta";
import { BookRow } from "@/components/lists/BookRow";
import { IdeaRow } from "@/components/lists/IdeaRow";
import { ReorderRow } from "@/components/lists/ReorderRow";
import { LedgerStats, LoanStats } from "@/components/lists/ListStats";
import { TextAddRow } from "@/components/lists/TextAddRow";
import {
  ItemEditorSheet,
  type ItemPatch,
} from "@/components/lists/ItemEditorSheet";
import {
  ListSettingsSheet,
  type ListPatch,
} from "@/components/lists/ListSettingsSheet";
import { InlineAdd } from "@/components/library/InlineAdd";
import { useBooks } from "@/lib/booksContext";
import {
  addListItem,
  deleteList,
  getList,
  removeListItem,
  reorderListItems,
  updateList,
  updateListItem,
} from "@/lib/lists";
import type { CatalogEntry } from "@/lib/library";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { books } = useBooks();
  const [list, setList] = useState<BookList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reordering, setReordering] = useState(false);

  const today = localDateStr(new Date());

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getList(id)
      .then((l) => {
        if (!l) {
          router.replace("/(tabs)/lists");
          return;
        }
        setList(l);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const isIdea = list ? IDEA_TYPES.has(list.listType) : false;
  const isChecklist = list?.listType === "checklist";
  const isLoan = list?.listType === "library_loan";
  const isLedger = list?.listType === "book_ledger";
  const meta = list ? listTypeMeta(list.listType) : null;
  const bullet = list?.bulletSymbol || "→";

  const handleAddBook = useCallback(
    async (catalog?: CatalogEntry, raw?: string) => {
      if (!list) return;
      const title = catalog?.title ?? raw?.trim();
      if (!title) return;
      const item = await addListItem(list.id, {
        title,
        author: catalog?.author ?? "",
        releaseDate: catalog?.releaseDate ?? "",
        bookId: catalog?.bookId, // only set for books already in the library
      });
      setList((prev) =>
        prev ? { ...prev, items: [...prev.items, item] } : prev,
      );
    },
    [list],
  );

  const handleAddText = useCallback(
    async (text: string) => {
      if (!list) return;
      const title = text.trim();
      if (!title) return;
      const item = await addListItem(list.id, { title });
      setList((prev) =>
        prev ? { ...prev, items: [...prev.items, item] } : prev,
      );
    },
    [list],
  );

  const handleToggle = useCallback((item: ListItem) => {
    const next = item.type === "done" ? "" : "done";
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === item.id ? { ...i, type: next } : i,
            ),
          }
        : prev,
    );
    updateListItem(item.id, { type: next }).catch(() => {});
  }, []);

  // list items carry title/author — match them against the library to
  // surface the same status pill the web shows on book_list rows.
  const statusFor = useCallback(
    (item: ListItem): string | undefined => {
      const t = item.title.toLowerCase();
      const a = (item.author ?? "").toLowerCase();
      const match = books.find(
        (b) =>
          b.title.toLowerCase() === t &&
          (!a || (b.author ?? "").toLowerCase() === a),
      );
      return match?.status;
    },
    [books],
  );

  const handleSaveItem = useCallback((itemId: string, patch: ItemPatch) => {
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, ...patch } : i,
            ),
          }
        : prev,
    );
    updateListItem(itemId, patch).catch(() => {});
  }, []);

  const handleRemove = useCallback((item: ListItem, listId: string) => {
    Alert.alert("remove item", `remove "${item.title}"?`, [
      { text: "cancel", style: "cancel" },
      {
        text: "remove",
        style: "destructive",
        onPress: () => {
          setList((prev) =>
            prev
              ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) }
              : prev,
          );
          removeListItem(item.id, listId).catch(() => {});
        },
      },
    ]);
  }, []);

  const handleMove = useCallback(
    (index: number, delta: -1 | 1) => {
      if (!list) return;
      const target = index + delta;
      if (target < 0 || target >= list.items.length) return;
      const prevItems = list.items;
      const items = [...prevItems];
      [items[index], items[target]] = [items[target], items[index]];
      setList({ ...list, items });
      reorderListItems(
        list.id,
        items.map((i) => i.id),
      ).catch(() => {
        setList((prev) => (prev ? { ...prev, items: prevItems } : prev));
        Alert.alert("couldn't reorder", "try again later.");
      });
    },
    [list],
  );

  const handleSaveList = useCallback(
    (patch: ListPatch) => {
      if (!list) return;
      setList({ ...list, ...patch });
      updateList(list.id, patch).catch(() => {});
    },
    [list],
  );

  const handleDeleteList = useCallback(() => {
    if (!list) return;
    Alert.alert("delete list", "this can't be undone.", [
      { text: "cancel", style: "cancel" },
      {
        text: "delete",
        style: "destructive",
        onPress: async () => {
          setSettingsOpen(false);
          await deleteList(list.id).catch(() => {});
          router.replace("/(tabs)/lists");
        },
      },
    ]);
  }, [list, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={C.fgMuted} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !list || !meta) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.error}>{error ?? "list not found."}</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backLink}>← back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backLink}>← lists</Text>
        </Pressable>
        <View style={styles.topActions}>
          {list.items.length > 1 ? (
            <Pressable onPress={() => setReordering((r) => !r)} hitSlop={10}>
              <Text style={styles.editLink}>
                {reordering ? "done" : "reorder"}
              </Text>
            </Pressable>
          ) : null}
          {reordering ? null : (
            <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10}>
              <Text style={styles.editLink}>edit</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GradientCover color={list.color} style={styles.cover}>
          <View style={styles.coverTypeRow}>
            <ListGlyph
              name={meta.icon}
              size={13}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={styles.coverType}>{meta.label}</Text>
          </View>
          <Text style={styles.coverTitle}>{list.title || "untitled"}</Text>
          <Text style={styles.coverMeta}>
            {list.items.length} {meta.itemLabel}
            {list.description ? ` · ${list.description}` : ""}
          </Text>
        </GradientCover>

        {isLoan ? <LoanStats list={list} today={today} /> : null}
        {isLedger ? <LedgerStats list={list} /> : null}

        <View style={styles.items}>
          {list.items.length === 0 ? (
            <Text style={styles.empty}>
              nothing here yet — add the first one.
            </Text>
          ) : reordering ? (
            list.items.map((item, i) => (
              <ReorderRow
                key={item.id}
                item={item}
                isFirst={i === 0}
                isLast={i === list.items.length - 1}
                onMove={(delta) => handleMove(i, delta)}
              />
            ))
          ) : (
            list.items.map((item) =>
              isIdea ? (
                <IdeaRow
                  key={item.id}
                  item={item}
                  isChecklist={isChecklist}
                  bullet={bullet}
                  onToggle={() => handleToggle(item)}
                  onRemove={() => handleRemove(item, list.id)}
                />
              ) : (
                <BookRow
                  key={item.id}
                  item={item}
                  listType={list.listType}
                  status={statusFor(item)}
                  today={today}
                  onPress={() => setEditingItem(item)}
                  onRemove={() => handleRemove(item, list.id)}
                />
              ),
            )
          )}
        </View>

        {reordering ? null : isIdea ? (
          <TextAddRow
            placeholder={`add ${meta.itemLabel.slice(0, -1) || "item"}…`}
            onAdd={handleAddText}
          />
        ) : (
          <View style={styles.bookAdd}>
            <InlineAdd
              placeholder="search a book or add by title…"
              onAdd={handleAddBook}
              libraryEntries={books}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ItemEditorSheet
        open={editingItem !== null}
        item={editingItem}
        listType={list.listType}
        onClose={() => setEditingItem(null)}
        onSave={(patch) => editingItem && handleSaveItem(editingItem.id, patch)}
        onRemove={() => {
          const it = editingItem;
          setEditingItem(null);
          if (it) handleRemove(it, list.id);
        }}
      />

      <ListSettingsSheet
        open={settingsOpen}
        list={list}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveList}
        onDelete={handleDeleteList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  error: { color: "#b03a2e" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backLink: { fontSize: 13, color: C.fgMuted, letterSpacing: 0.2 },
  editLink: { fontSize: 13, color: C.terraInk, letterSpacing: 0.2 },
  topActions: { flexDirection: "row", gap: 18 },

  cover: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    overflow: "hidden",
    marginBottom: 16,
  },
  coverTypeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  coverType: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  coverTitle: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 28,
    fontWeight: "700",
    color: C.cream,
    letterSpacing: -0.6,
    marginTop: 4,
    lineHeight: 32,
  },
  coverMeta: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
  },

  items: { gap: 4 },
  empty: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 15,
    color: C.fgFaint,
    paddingVertical: 24,
    textAlign: "center",
  },

  bookAdd: { marginTop: 12 },
});
