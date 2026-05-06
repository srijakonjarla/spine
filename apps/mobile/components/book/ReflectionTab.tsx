import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import type { BookEntry } from "@spine/shared";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

function relativeTime(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function ReflectionTab({
  entry,
  onPatch,
}: {
  entry: BookEntry;
  onPatch: (p: Partial<BookEntry>) => Promise<void>;
}) {
  const [draft, setDraft] = useState(entry.feeling ?? "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(entry.feeling ?? "");

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (v: string) => {
      setDraft(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (v === lastSavedRef.current) return;
        setSaving(true);
        try {
          await onPatch({ feeling: v });
          lastSavedRef.current = v;
          setSavedAt(new Date());
        } finally {
          setSaving(false);
        }
      }, 700);
    },
    [onPatch],
  );

  return (
    <View>
      <View style={s.card}>
        <Text style={s.label}>my reflection</Text>
        <View style={s.surface}>
          <TextInput
            value={draft}
            onChangeText={handleChange}
            multiline
            placeholder="how did this read go?"
            placeholderTextColor={C.fgFaint}
            style={s.input}
            textAlignVertical="top"
          />
        </View>
        <Text style={s.savedHint}>
          {saving
            ? "saving…"
            : savedAt
              ? `auto-saved · ${relativeTime(savedAt)}`
              : "auto-saves as you type"}
        </Text>
      </View>
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
});
