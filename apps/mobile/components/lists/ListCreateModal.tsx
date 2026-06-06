import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SheetModal, sheetStyles } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";
import { GradientCover } from "./GradientCover";
import { ListGlyph } from "./listIcons";
import { ColorPicker, IconPicker } from "./Pickers";
import { LIST_TYPES, type ListTypeValue } from "./coverMeta";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export interface NewListDraft {
  name: string;
  listType: ListTypeValue;
  color: string;
  emoji: string;
  description: string;
}

const SINGLETON_TYPES: ReadonlySet<string> = new Set([
  "library_loan",
  "book_ledger",
]);

export function ListCreateModal({
  open,
  saving,
  existingTypes,
  onClose,
  onCreate,
}: {
  open: boolean;
  saving: boolean;
  existingTypes: string[];
  onClose: () => void;
  onCreate: (draft: NewListDraft) => void;
}) {
  const [name, setName] = useState("");
  const [listType, setListType] = useState<ListTypeValue>("book_list");
  const [color, setColor] = useState<string>("plum");
  const [emoji, setEmoji] = useState<string>("Books");
  const [description, setDescription] = useState("");

  const canSave = name.trim().length > 0 && !saving;

  const handleCreate = () => {
    if (!canSave) return;
    onCreate({ name: name.trim(), listType, color, emoji, description });
  };

  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={sheetStyles.title}>new list</Text>
      <Text style={sheetStyles.subtitle}>
        books, ideas, bullet points — anything
      </Text>

      <GradientCover color={color} style={styles.preview}>
        <ListGlyph name={emoji} size={26} color="rgba(255,255,255,0.92)" />
        <Text style={styles.previewTitle} numberOfLines={1}>
          {name.trim() || "list title"}
        </Text>
      </GradientCover>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <Text style={sheetStyles.fieldLabel}>name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="what's this list for?"
          placeholderTextColor={C.fgFaint}
          style={sheetStyles.input}
          autoFocus
        />

        <Text style={sheetStyles.fieldLabel}>type</Text>
        <View style={styles.chipWrap}>
          {LIST_TYPES.map((t) => {
            const used =
              SINGLETON_TYPES.has(t.value) && existingTypes.includes(t.value);
            const active = listType === t.value;
            return (
              <Pressable
                key={t.value}
                disabled={used}
                onPress={() => setListType(t.value)}
                style={[
                  styles.typeChip,
                  active && styles.typeChipActive,
                  used && styles.typeChipDisabled,
                ]}
              >
                <ListGlyph
                  name={t.icon}
                  size={13}
                  color={active ? C.cream : used ? C.fgFaint : C.fgMid}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    active && styles.typeChipTextActive,
                    used && { color: C.fgFaint },
                  ]}
                >
                  {t.label}
                  {used ? " ✓" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={sheetStyles.fieldLabel}>color</Text>
        <ColorPicker value={color} onChange={setColor} />

        <Text style={sheetStyles.fieldLabel}>icon</Text>
        <IconPicker value={emoji} onChange={setEmoji} />

        <Text style={sheetStyles.fieldLabel}>description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="a note about this list…"
          placeholderTextColor={C.fgFaint}
          style={sheetStyles.input}
        />
      </ScrollView>

      <View style={sheetStyles.actionsRow}>
        <Pressable onPress={onClose} style={sheetStyles.cancelBtn}>
          <Text style={sheetStyles.cancelText}>cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleCreate}
          disabled={!canSave}
          style={[sheetStyles.primaryBtn, !canSave && { opacity: 0.5 }]}
        >
          <Text style={sheetStyles.primaryText}>
            {saving ? "creating…" : "create list"}
          </Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 76,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "space-between",
    marginVertical: 8,
    overflow: "hidden",
  },
  previewTitle: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontWeight: "700",
    fontSize: 18,
    color: C.cream,
    letterSpacing: -0.3,
  },
  scroll: { maxHeight: 320 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
  typeChipActive: { backgroundColor: C.plum, borderColor: C.plum },
  typeChipDisabled: { opacity: 0.55 },
  typeChipText: { fontSize: 12, color: C.fgMid, letterSpacing: 0.1 },
  typeChipTextActive: { color: C.cream },
});
