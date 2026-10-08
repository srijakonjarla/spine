import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { BookEntry, BookRead } from "@spine/shared";
import { C } from "@/components/login/tokens";
import type { ReadPatch } from "@/lib/library";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

function relativeTime(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

/**
 * Debounced auto-save for a reflection textarea. Returns the draft, its
 * change handler, and a status line ("saving…" / "auto-saved · 2m ago").
 */
function useAutoSave(initial: string, save: (v: string) => Promise<void>) {
  const [draft, setDraft] = useState(initial);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initial);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onChange = useCallback(
    (v: string) => {
      setDraft(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (v === lastSavedRef.current) return;
        setSaving(true);
        try {
          await save(v);
          lastSavedRef.current = v;
          setSavedAt(new Date());
        } finally {
          setSaving(false);
        }
      }, 700);
    },
    [save],
  );

  const status = saving
    ? "saving…"
    : savedAt
      ? `auto-saved · ${relativeTime(savedAt)}`
      : "auto-saves as you type";

  return { draft, onChange, status };
}

export function ReflectionTab({
  entry,
  onPatch,
  viewedRead,
  onUpdateRead,
  onDeleteRead,
}: {
  entry: BookEntry;
  onPatch: (p: Partial<BookEntry>) => Promise<void>;
  /** A past read picked in the read selector; null = the current read. */
  viewedRead: BookRead | null;
  onUpdateRead: (readId: string, patch: Partial<ReadPatch>) => Promise<void>;
  onDeleteRead: (readId: string) => Promise<void>;
}) {
  if (viewedRead) {
    return (
      <PastReadReflection
        // Remount per read so drafts never leak between reads.
        key={viewedRead.id}
        read={viewedRead}
        readIndex={entry.reads.indexOf(viewedRead) + 1}
        onUpdateRead={onUpdateRead}
        onDeleteRead={onDeleteRead}
      />
    );
  }
  return <CurrentReflection entry={entry} onPatch={onPatch} />;
}

function CurrentReflection({
  entry,
  onPatch,
}: {
  entry: BookEntry;
  onPatch: (p: Partial<BookEntry>) => Promise<void>;
}) {
  const save = useCallback((v: string) => onPatch({ feeling: v }), [onPatch]);
  const { draft, onChange, status } = useAutoSave(entry.feeling ?? "", save);

  return (
    <View>
      <View style={s.card}>
        <Text style={s.label}>my reflection</Text>
        <View style={s.surface}>
          <TextInput
            value={draft}
            onChangeText={onChange}
            multiline
            placeholder="how did this read go?"
            placeholderTextColor={C.fgFaint}
            style={s.input}
            textAlignVertical="top"
          />
        </View>
        <Text style={s.savedHint}>{status}</Text>
      </View>
    </View>
  );
}

function PastReadReflection({
  read,
  readIndex,
  onUpdateRead,
  onDeleteRead,
}: {
  read: BookRead;
  readIndex: number;
  onUpdateRead: (readId: string, patch: Partial<ReadPatch>) => Promise<void>;
  onDeleteRead: (readId: string) => Promise<void>;
}) {
  const save = useCallback(
    (v: string) => onUpdateRead(read.id, { feeling: v }),
    [onUpdateRead, read.id],
  );
  const { draft, onChange, status } = useAutoSave(read.feeling ?? "", save);

  const setRating = (n: number) =>
    onUpdateRead(read.id, { rating: read.rating === n ? 0 : n }).catch(() =>
      Alert.alert("couldn't save rating", "try again later."),
    );

  const confirmDelete = () =>
    Alert.alert("delete read", `remove read ${readIndex} from your history?`, [
      { text: "cancel", style: "cancel" },
      {
        text: "delete",
        style: "destructive",
        onPress: () =>
          onDeleteRead(read.id).catch(() =>
            Alert.alert("couldn't delete read", "try again later."),
          ),
      },
    ]);

  return (
    <View style={{ gap: 14 }}>
      <View style={s.card}>
        <Text style={s.label}>my reflection · read {readIndex}</Text>
        <View style={s.surface}>
          <TextInput
            value={draft}
            onChangeText={onChange}
            multiline
            placeholder="how did this read go?"
            placeholderTextColor={C.fgFaint}
            style={s.input}
            textAlignVertical="top"
          />
        </View>
        <Text style={s.savedHint}>{status}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.label}>rating</Text>
        <View style={s.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              hitSlop={4}
              onPress={() => setRating(n)}
              accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
            >
              <Text
                style={[s.star, { color: n <= read.rating ? C.gold : C.line }]}
              >
                ★
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable hitSlop={8} onPress={confirmDelete} style={s.deleteBtn}>
        <Text style={s.deleteText}>delete this read</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    fontFamily: SERIF,
    fontSize: 13,
    fontStyle: "italic",
    color: C.fgMuted,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  surface: {
    backgroundColor: C.cream,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 220,
  },
  input: {
    fontFamily: SERIF,
    fontSize: 15,
    fontStyle: "italic",
    color: C.fg,
    minHeight: 196,
    lineHeight: 24,
    padding: 0,
  },
  savedHint: {
    fontSize: 11,
    color: C.fgFaint,
    marginTop: 12,
    letterSpacing: 0.3,
    textAlign: "right",
  },
  starRow: { flexDirection: "row", gap: 8 },
  star: { fontSize: 26 },
  deleteBtn: { alignSelf: "center", paddingVertical: 8 },
  deleteText: { fontSize: 12, color: C.danger, letterSpacing: 0.2 },
});
