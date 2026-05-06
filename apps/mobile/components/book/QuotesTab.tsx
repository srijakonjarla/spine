import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Quote } from "@spine/shared";
import { C } from "@/components/login/tokens";
import { addQuote, deleteQuote, getQuotes } from "@/lib/library";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export function QuotesTab({ bookId }: { bookId: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getQuotes(bookId)
      .then((q) => {
        if (!cancelled) setQuotes(q);
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
  }, [bookId]);

  const handleAdd = useCallback(async () => {
    const t = text.trim();
    if (!t || adding) return;
    setAdding(true);
    try {
      const q = await addQuote(t, bookId, page.trim());
      setQuotes((prev) => [q, ...prev]);
      setText("");
      setPage("");
      setOpen(false);
    } finally {
      setAdding(false);
    }
  }, [adding, bookId, page, text]);

  const handleDelete = useCallback(async (id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    try {
      await deleteQuote(id);
    } catch {
      // best effort — refetch on next mount fixes drift
    }
  }, []);

  return (
    <View>
      <View style={s.header}>
        <Text style={s.sectionLabel}>underlined passages</Text>
        <Pressable
          hitSlop={6}
          onPress={() => setOpen((v) => !v)}
          style={[s.toggle, open && s.toggleOpen]}
        >
          <Text style={[s.toggleText, open && s.toggleTextOpen]}>
            {open ? "cancel" : "+ add quote"}
          </Text>
        </Pressable>
      </View>

      {open ? (
        <View style={s.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder="paste the quote…"
            placeholderTextColor={C.fgFaint}
            autoFocus
            style={s.composerText}
            textAlignVertical="top"
          />
          <View style={s.composerRow}>
            <TextInput
              value={page}
              onChangeText={setPage}
              placeholder="p. 42 (optional)"
              placeholderTextColor={C.fgFaint}
              style={s.composerPage}
            />
            <Pressable
              onPress={handleAdd}
              disabled={!text.trim() || adding}
              style={({ pressed }) => [
                s.saveBtn,
                (!text.trim() || adding) && { opacity: 0.4 },
                pressed && { backgroundColor: C.terraPressed },
              ]}
            >
              <Text style={s.saveText}>
                {adding ? "saving…" : "save quote"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={{ paddingVertical: 36, alignItems: "center" }}>
          <ActivityIndicator color={C.fgMuted} />
        </View>
      ) : error ? (
        <Text style={s.error}>couldn&apos;t load. {error}</Text>
      ) : quotes.length === 0 && !open ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <Text style={s.empty}>no quotes saved yet</Text>
          <Text style={s.emptyHint}>add your first underlined quote</Text>
        </View>
      ) : (
        <View style={s.list}>
          {quotes.map((q) => (
            <View key={q.id} style={s.card}>
              <Text style={s.text}>“{q.text}”</Text>
              <View style={s.footer}>
                <Text style={s.pageLabel}>
                  {q.pageNumber ? `p. ${q.pageNumber}` : ""}
                </Text>
                <Pressable hitSlop={6} onPress={() => handleDelete(q.id)}>
                  <Text style={s.delete}>×</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  sectionLabel: {
    fontFamily: SERIF,
    fontSize: 13,
    fontStyle: "italic",
    color: C.fgMuted,
    letterSpacing: 0.2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(201,123,90,0.15)",
  },
  toggleOpen: { backgroundColor: C.paperDeep },
  toggleText: {
    fontSize: 11,
    color: C.terraInk,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  toggleTextOpen: { color: C.fgMuted },
  composer: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 18,
  },
  composerText: {
    fontFamily: SERIF,
    fontSize: 15,
    fontStyle: "italic",
    color: C.fg,
    minHeight: 80,
    lineHeight: 24,
    padding: 0,
  },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  composerPage: {
    flex: 1,
    fontSize: 12,
    color: C.fg,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  saveBtn: {
    backgroundColor: C.terraInk,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveText: {
    color: C.cream,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  empty: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 16,
    color: C.fgFaint,
  },
  emptyHint: { fontSize: 12, color: C.fgFaint, marginTop: 6 },
  error: { color: "#b03a2e", fontSize: 14, paddingVertical: 16 },
  list: { gap: 12 },
  card: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: C.terraInk,
  },
  text: {
    fontFamily: SERIF,
    fontSize: 15,
    fontStyle: "italic",
    color: C.fg,
    lineHeight: 24,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  pageLabel: { fontSize: 11, color: C.fgMuted, letterSpacing: 0.4 },
  delete: { fontSize: 18, color: C.fgFaint, paddingHorizontal: 4 },
});
