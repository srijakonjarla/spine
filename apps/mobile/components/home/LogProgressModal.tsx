import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SheetModal, sheetStyles as m } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";

export function LogProgressModal({
  open,
  bookTitle,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  bookTitle?: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: { pages: number; note: string }) => Promise<void>;
}) {
  const [pages, setPages] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setPages("");
      setNote("");
    }
  }, [open]);

  const submit = () => {
    const n = Number(pages.trim());
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("hmm", "enter a number greater than zero.");
      return;
    }
    void onSubmit({ pages: Math.round(n), note });
  };

  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={m.title}>log progress</Text>
      {bookTitle ? <Text style={m.subtitle}>{bookTitle}</Text> : null}

      <Text style={m.fieldLabel}>pages read</Text>
      <TextInput
        value={pages}
        onChangeText={setPages}
        placeholder="e.g. 32"
        placeholderTextColor={C.fgFaint}
        keyboardType="number-pad"
        style={m.input}
        autoFocus
      />

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
          disabled={busy || !pages.trim()}
          style={({ pressed }) => [
            m.primaryBtn,
            (busy || !pages.trim()) && { opacity: 0.4 },
            pressed && { backgroundColor: C.terraPressed },
          ]}
        >
          <Text style={m.primaryText}>{busy ? "logging…" : "log"}</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}
