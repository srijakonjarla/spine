import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { BookEntry } from "@spine/shared";
import { C } from "@/components/login/tokens";
import { searchCatalog, type CatalogEntry } from "@/lib/library";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

const STATUS_SYMBOL: Record<string, string> = {
  reading: "○",
  finished: "✓",
  "want-to-read": "◌",
  "did-not-finish": "×",
};

const STATUS_LABEL: Record<string, string> = {
  reading: "reading",
  finished: "finished",
  "want-to-read": "tbr",
  "did-not-finish": "dnf",
};

export function InlineAdd({
  placeholder,
  onAdd,
  libraryEntries,
}: {
  placeholder: string;
  onAdd: (catalog?: CatalogEntry, raw?: string) => Promise<void>;
  libraryEntries?: BookEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (v: string) => {
      setValue(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!v.trim()) {
        setSuggestions([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const q = v.toLowerCase();
          const libMatches: CatalogEntry[] = (libraryEntries ?? [])
            .filter(
              (b) =>
                b.title.toLowerCase().includes(q) ||
                (b.author ?? "").toLowerCase().includes(q),
            )
            .slice(0, 5)
            .map((b) => ({
              id: b.id,
              title: b.title,
              author: b.author,
              releaseDate: "",
              genres: b.genres,
              coverUrl: b.coverUrl,
              isbn: b.isbn,
              pageCount: b.pageCount,
              publisher: b.publisher ?? "",
              diversityTags: b.diversityTags ?? [],
              audioDurationMinutes: b.audioDurationMinutes ?? null,
              status: b.status,
              bookId: b.id,
              catalogBookId: b.catalogBookId,
            }));

          const remote = await searchCatalog(v);
          const deduped = remote.filter(
            (r) =>
              !libMatches.some((lm) => {
                if (r.isbn && lm.isbn && r.isbn === lm.isbn) return true;
                return (
                  r.title.toLowerCase() === lm.title.toLowerCase() &&
                  r.author.toLowerCase() === (lm.author ?? "").toLowerCase()
                );
              }),
          );
          setSuggestions([...libMatches, ...deduped].slice(0, 8));
        } catch {
          setSuggestions([]);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [libraryEntries],
  );

  const close = () => {
    setOpen(false);
    setValue("");
    setSuggestions([]);
  };

  const handleAdd = async (catalog?: CatalogEntry) => {
    if (adding) return;
    setAdding(true);
    try {
      await onAdd(catalog, value);
      close();
    } finally {
      setAdding(false);
    }
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.trigger}
        hitSlop={8}
      >
        <Text style={styles.triggerText}>{placeholder}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={C.fgFaint}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          editable={!adding}
          onSubmitEditing={() => {
            if (value.trim() && suggestions.length === 0) handleAdd();
          }}
        />
        <Pressable onPress={close} hitSlop={8} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>cancel</Text>
        </Pressable>
      </View>

      {searching && suggestions.length === 0 && value.trim() ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={C.fgMuted} size="small" />
          <Text style={styles.statusText}>searching…</Text>
        </View>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((s, i) => (
            <Pressable
              key={`${s.id}-${i}`}
              onPress={() => handleAdd(s)}
              disabled={adding}
              style={({ pressed }) => [
                styles.suggestionRow,
                pressed && { backgroundColor: C.paperDeep },
                i === suggestions.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.sugTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                {s.author ? (
                  <Text style={styles.sugAuthor} numberOfLines={1}>
                    {s.author}
                  </Text>
                ) : null}
              </View>
              {s.status ? (
                <Text style={styles.sugStatus}>
                  {STATUS_SYMBOL[s.status] ?? "·"}{" "}
                  {STATUS_LABEL[s.status] ?? s.status}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {value.trim() && suggestions.length === 0 && !searching ? (
        <Pressable
          onPress={() => handleAdd()}
          disabled={adding}
          style={({ pressed }) => [
            styles.addRawBtn,
            pressed && { backgroundColor: C.terraPressed },
            adding && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.addRawText}>
            {adding ? "adding…" : `add "${value.trim()}"`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { paddingVertical: 8 },
  triggerText: {
    fontFamily: SERIF,
    fontSize: 13,
    color: C.fgFaint,
    fontStyle: "italic",
    letterSpacing: 0.1,
  },
  wrap: { marginTop: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.fg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 8,
  },
  cancelBtn: { paddingVertical: 6 },
  cancelText: { fontSize: 12, color: C.fgFaint, letterSpacing: 0.3 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  statusText: { fontSize: 12, color: C.fgMuted },
  suggestions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    backgroundColor: C.paper,
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  sugTitle: {
    fontSize: 14,
    color: C.fg,
    fontFamily: SERIF,
    letterSpacing: -0.2,
  },
  sugAuthor: { fontSize: 11, color: C.fgMuted, marginTop: 2 },
  sugStatus: {
    fontSize: 10,
    color: C.terraInk,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  addRawBtn: {
    marginTop: 10,
    backgroundColor: C.terraInk,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
  },
  addRawText: {
    color: C.cream,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
