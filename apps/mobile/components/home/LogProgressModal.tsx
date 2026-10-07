import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SheetModal, sheetStyles as m } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";

type Mode = "pages" | "percent";

/**
 * Logs a progress entry on a book (a thought), same as web's quick log:
 * an optional "up to page" position and an optional note — at least one.
 * Day-level journal notes live on the calendar instead.
 */
export function LogProgressModal({
  open,
  bookTitle,
  pageCount,
  currentPage = 0,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  bookTitle?: string;
  pageCount?: number | null;
  /** Furthest page already logged for this book (0 if none). */
  currentPage?: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: { page: number | null; note: string }) => Promise<void>;
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

  // Pages and note are each optional, but at least one is required.
  const hasPages = value.trim() !== "";
  const hasNote = note.trim() !== "";
  const canSubmit = hasPages || hasNote;

  const submit = () => {
    if (!canSubmit) return;
    if (!hasPages) {
      void onSubmit({ page: null, note: note.trim() });
      return;
    }
    const n = Number(value.trim());
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("hmm", "enter a number greater than zero.");
      return;
    }
    let page: number;
    if (mode === "percent") {
      if (n > 100) {
        Alert.alert("hmm", "percentage can't be more than 100.");
        return;
      }
      page = Math.round((n / 100) * (pageCount ?? 0));
      if (page <= 0) {
        Alert.alert("hmm", "that percentage rounds to page zero.");
        return;
      }
    } else {
      page = Math.round(n);
      if (pageCount && page > pageCount) {
        Alert.alert("hmm", `this book has ${pageCount} pages.`);
        return;
      }
    }
    void onSubmit({ page, note: note.trim() });
  };

  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={m.title}>log progress</Text>
      {bookTitle ? (
        <Text style={m.subtitle}>
          {bookTitle}
          {pageCount
            ? ` · p. ${currentPage} / ${pageCount}`
            : currentPage > 0
              ? ` · p. ${currentPage}`
              : ""}
        </Text>
      ) : null}

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
        {mode === "pages" ? "up to page" : "percent through"} (optional)
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={
          mode === "pages"
            ? `e.g. ${currentPage > 0 ? currentPage + 30 : 50}`
            : "e.g. 15"
        }
        placeholderTextColor={C.fgFaint}
        keyboardType="number-pad"
        style={m.input}
        autoFocus
      />
      {mode === "percent" && pageCount ? (
        <Text style={s.hint}>
          {(() => {
            const n = Number(value.trim());
            if (!Number.isFinite(n) || n <= 0 || n > 100)
              return `of ${pageCount} pages`;
            return `≈ page ${Math.round((n / 100) * pageCount)} of ${pageCount}`;
          })()}
        </Text>
      ) : null}

      <Text style={m.fieldLabel}>note (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="how's it going?"
        placeholderTextColor={C.fgFaint}
        multiline
        style={[m.input, m.inputMulti]}
        textAlignVertical="top"
      />

      {!canSubmit ? (
        <Text style={s.hint}>add a page, a note, or both.</Text>
      ) : null}

      <View style={m.actionsRow}>
        <Pressable hitSlop={8} onPress={onClose} style={m.cancelBtn}>
          <Text style={m.cancelText}>cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={busy || !canSubmit}
          style={({ pressed }) => [
            m.primaryBtn,
            (busy || !canSubmit) && { opacity: 0.4 },
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
