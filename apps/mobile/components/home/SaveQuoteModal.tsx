import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SheetModal, sheetStyles as m } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";

export function SaveQuoteModal({
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
  onSubmit: (v: { text: string; page: string }) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [page, setPage] = useState("");

  useEffect(() => {
    if (!open) {
      setText("");
      setPage("");
    }
  }, [open]);

  const submit = () => {
    if (!text.trim()) return;
    void onSubmit({ text, page });
  };

  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={m.title}>save a quote</Text>
      {bookTitle ? <Text style={m.subtitle}>{bookTitle}</Text> : null}

      <Text style={m.fieldLabel}>quote</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="paste the passage…"
        placeholderTextColor={C.fgFaint}
        multiline
        style={[m.input, m.inputMulti, m.inputSerif]}
        textAlignVertical="top"
        autoFocus
      />

      <Text style={m.fieldLabel}>page (optional)</Text>
      <TextInput
        value={page}
        onChangeText={setPage}
        placeholder="e.g. 142"
        placeholderTextColor={C.fgFaint}
        keyboardType="number-pad"
        style={m.input}
      />

      <View style={m.actionsRow}>
        <Pressable hitSlop={8} onPress={onClose} style={m.cancelBtn}>
          <Text style={m.cancelText}>cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={busy || !text.trim()}
          style={({ pressed }) => [
            m.primaryBtn,
            (busy || !text.trim()) && { opacity: 0.4 },
            pressed && { backgroundColor: C.terraPressed },
          ]}
        >
          <Text style={m.primaryText}>{busy ? "saving…" : "save"}</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}
