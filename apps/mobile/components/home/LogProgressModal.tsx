import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SheetModal, sheetStyles as m } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";

type Mode = "pages" | "percent";

export function LogProgressModal({
  open,
  bookTitle,
  pageCount,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  bookTitle?: string;
  pageCount?: number | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: { pages: number; note: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("pages");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const canUsePercent = !!pageCount && pageCount > 0;

  useEffect(() => {
    if (!open) {
      setValue("");
      setNote("");
      setMode("pages");
    }
  }, [open]);

  useEffect(() => {
    if (mode === "percent" && !canUsePercent) setMode("pages");
  }, [mode, canUsePercent]);

  const submit = () => {
    const n = Number(value.trim());
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("hmm", "enter a number greater than zero.");
      return;
    }
    if (mode === "percent") {
      if (n > 100) {
        Alert.alert("hmm", "percentage can't be more than 100.");
        return;
      }
      const pages = Math.round((n / 100) * (pageCount ?? 0));
      if (pages <= 0) {
        Alert.alert("hmm", "that percentage rounds to zero pages.");
        return;
      }
      void onSubmit({ pages, note });
    } else {
      void onSubmit({ pages: Math.round(n), note });
    }
  };

  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={m.title}>log progress</Text>
      {bookTitle ? <Text style={m.subtitle}>{bookTitle}</Text> : null}

      <View style={s.toggle}>
        <Pressable
          onPress={() => setMode("pages")}
          style={[s.toggleBtn, mode === "pages" && s.toggleBtnActive]}
        >
          <Text style={[s.toggleText, mode === "pages" && s.toggleTextActive]}>
            pages
          </Text>
        </Pressable>
        <Pressable
          onPress={() => canUsePercent && setMode("percent")}
          style={[
            s.toggleBtn,
            mode === "percent" && s.toggleBtnActive,
            !canUsePercent && s.toggleBtnDisabled,
          ]}
        >
          <Text
            style={[
              s.toggleText,
              mode === "percent" && s.toggleTextActive,
              !canUsePercent && s.toggleTextDisabled,
            ]}
          >
            %
          </Text>
        </Pressable>
      </View>
      {!canUsePercent && (
        <Text style={s.hint}>add a page count to this book to use %</Text>
      )}

      <Text style={m.fieldLabel}>
        {mode === "pages" ? "pages read" : "percent read"}
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={mode === "pages" ? "e.g. 32" : "e.g. 15"}
        placeholderTextColor={C.fgFaint}
        keyboardType="number-pad"
        style={m.input}
        autoFocus
      />
      {mode === "percent" && pageCount ? (
        <Text style={s.hint}>
          {(() => {
            const n = Number(value.trim());
            if (!Number.isFinite(n) || n <= 0 || n > 100) return `of ${pageCount} pages`;
            return `≈ ${Math.round((n / 100) * pageCount)} of ${pageCount} pages`;
          })()}
        </Text>
      ) : null}

      <Text style={m.fieldLabel}>note (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="anything to remember about today's reading?"
        placeholderTextColor={C.fgFaint}
        multiline
        style={[m.input, m.inputMulti]}
        textAlignVertical="top"
      />

      <View style={m.actionsRow}>
        <Pressable hitSlop={8} onPress={onClose} style={m.cancelBtn}>
          <Text style={m.cancelText}>cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={busy || !value.trim()}
          style={({ pressed }) => [
            m.primaryBtn,
            (busy || !value.trim()) && { opacity: 0.4 },
            pressed && { backgroundColor: C.terraPressed },
          ]}
        >
          <Text style={m.primaryText}>{busy ? "logging…" : "log"}</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}

const s = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    backgroundColor: C.paperDeep,
    borderRadius: 10,
    padding: 3,
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: C.cream,
    shadowColor: C.plum,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  toggleBtnDisabled: { opacity: 0.35 },
  toggleText: {
    fontSize: 13,
    fontWeight: "500",
    color: C.fgMuted,
  },
  toggleTextActive: { color: C.plum, fontWeight: "600" },
  toggleTextDisabled: {},
  hint: {
    fontSize: 11,
    color: C.fgFaint,
    marginTop: -4,
  },
});
