import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { BookList } from "@spine/shared";
import { SheetModal, sheetStyles } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";
import { ColorPicker, IconPicker } from "./Pickers";
import { BULLET_SYMBOLS, IDEA_TYPES } from "./coverMeta";

export interface ListPatch {
  title?: string;
  description?: string;
  color?: string;
  emoji?: string;
  bulletSymbol?: string;
}

/**
 * List-level settings: title, description (labelled per type), bullet symbol
 * (idea/bullet lists), cover color + icon, and delete. Text fields auto-save
 * with a short debounce; pickers save immediately.
 */
export function ListSettingsSheet({
  open,
  list,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  list: BookList | null;
  onClose: () => void;
  onSave: (patch: ListPatch) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!list) return;
    setTitle(list.title ?? "");
    setDescription(list.description ?? "");
  }, [list]);

  const queueSave = (patch: ListPatch) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(patch), 500);
  };

  const flushAndClose = () => {
    if (timer.current) clearTimeout(timer.current);
    onSave({ title, description });
    onClose();
  };

  if (!list) {
    return (
      <SheetModal open={open} onClose={onClose}>
        <></>
      </SheetModal>
    );
  }

  const isIdea = IDEA_TYPES.has(list.listType);
  const isLoan = list.listType === "library_loan";
  const descLabel = isLoan ? "library / branch" : "notes";
  const descPlaceholder = isLoan
    ? "e.g. Brooklyn Public Library, Central Branch"
    : "notes about this list…";

  return (
    <SheetModal open={open} onClose={flushAndClose}>
      <Text style={sheetStyles.title}>list settings</Text>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <Text style={sheetStyles.fieldLabel}>title</Text>
        <TextInput
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            queueSave({ title: v });
          }}
          placeholder="list title"
          placeholderTextColor={C.fgFaint}
          style={sheetStyles.input}
        />

        <Text style={sheetStyles.fieldLabel}>{descLabel}</Text>
        <TextInput
          value={description}
          onChangeText={(v) => {
            setDescription(v);
            queueSave({ description: v });
          }}
          placeholder={descPlaceholder}
          placeholderTextColor={C.fgFaint}
          multiline
          style={[sheetStyles.input, sheetStyles.inputMulti]}
        />

        {isIdea ? (
          <>
            <Text style={sheetStyles.fieldLabel}>bullet symbol</Text>
            <View style={styles.symbolRow}>
              {BULLET_SYMBOLS.map((sym) => {
                const active = (list.bulletSymbol || "→") === sym;
                return (
                  <Pressable
                    key={sym}
                    onPress={() => onSave({ bulletSymbol: sym })}
                    style={[styles.symbolBtn, active && styles.symbolBtnActive]}
                  >
                    <Text
                      style={[
                        styles.symbolText,
                        active && styles.symbolTextActive,
                      ]}
                    >
                      {sym}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={sheetStyles.fieldLabel}>cover color</Text>
        <ColorPicker
          value={list.color}
          onChange={(c) => onSave({ color: c })}
        />

        <Text style={sheetStyles.fieldLabel}>icon</Text>
        <IconPicker
          value={list.emoji}
          onChange={(ic) => onSave({ emoji: ic })}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>delete list</Text>
        </Pressable>
        <Pressable onPress={flushAndClose} style={sheetStyles.primaryBtn}>
          <Text style={sheetStyles.primaryText}>done</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 360 },
  symbolRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  symbolBtn: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
  symbolBtnActive: { backgroundColor: C.terra, borderColor: C.terra },
  symbolText: { fontSize: 16, color: C.terra },
  symbolTextActive: { color: C.cream },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  deleteBtn: { paddingVertical: 8, paddingRight: 12 },
  deleteText: { fontSize: 13, color: "#b03a2e", letterSpacing: 0.2 },
});
