import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SheetModal, sheetStyles } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";

export interface NewGoalDraft {
  isAuto: boolean;
  name: string;
  target: number;
}

/**
 * Create a reading goal: a yearly goal (auto, one per year — tracks every
 * book finished this year) or a custom goal (named, tracks pinned books).
 * Mirrors the web year/goal page's two creation forms.
 */
export function GoalCreateModal({
  open,
  year,
  saving,
  hasYearly,
  onClose,
  onCreate,
}: {
  open: boolean;
  year: number;
  saving: boolean;
  hasYearly: boolean;
  onClose: () => void;
  onCreate: (draft: NewGoalDraft) => void;
}) {
  // Default to custom when a yearly goal already exists for the year.
  const [isAuto, setIsAuto] = useState(!hasYearly);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (open) setIsAuto(!hasYearly);
  }, [open, hasYearly]);

  const targetNum = Number(target);
  const validTarget = Number.isFinite(targetNum) && targetNum >= 1;
  const canSave = validTarget && (isAuto || name.trim().length > 0) && !saving;

  const handleCreate = () => {
    if (!canSave) return;
    onCreate({
      isAuto,
      name: isAuto ? `${year} reading goal` : name.trim(),
      target: Math.round(targetNum),
    });
  };

  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={sheetStyles.title}>new goal</Text>
      <Text style={sheetStyles.subtitle}>track your reading for {year}</Text>

      {/* Type toggle */}
      <View style={styles.segmented}>
        <Pressable
          onPress={() => setIsAuto(true)}
          disabled={hasYearly}
          style={[
            styles.segment,
            isAuto && styles.segmentActive,
            hasYearly && styles.segmentDisabled,
          ]}
        >
          <Text
            style={[styles.segmentText, isAuto && styles.segmentTextActive]}
          >
            yearly{hasYearly ? " ✓" : ""}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setIsAuto(false)}
          style={[styles.segment, !isAuto && styles.segmentActive]}
        >
          <Text
            style={[styles.segmentText, !isAuto && styles.segmentTextActive]}
          >
            custom
          </Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        {isAuto
          ? "counts every book you finish this year."
          : "counts books you pin to this goal."}
      </Text>

      {!isAuto ? (
        <>
          <Text style={sheetStyles.fieldLabel}>name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. read more non-fiction"
            placeholderTextColor={C.fgFaint}
            style={sheetStyles.input}
            autoFocus
          />
        </>
      ) : null}

      <Text style={sheetStyles.fieldLabel}>target books</Text>
      <TextInput
        value={target}
        onChangeText={setTarget}
        placeholder="12"
        placeholderTextColor={C.fgFaint}
        keyboardType="number-pad"
        style={sheetStyles.input}
        autoFocus={isAuto}
      />

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
            {saving ? "saving…" : "set goal"}
          </Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: "row", gap: 8, marginTop: 8 },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: C.plum, borderColor: C.plum },
  segmentDisabled: { opacity: 0.55 },
  segmentText: { fontSize: 13, color: C.fgMid, letterSpacing: 0.1 },
  segmentTextActive: { color: C.cream },
  hint: {
    fontSize: 12,
    color: C.fgMuted,
    fontStyle: "italic",
    marginTop: 8,
  },
});
