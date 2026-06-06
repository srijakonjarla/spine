import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ListItem } from "@spine/shared";
import { SheetModal, sheetStyles } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";
import { LOAN_STATUSES, TX_TYPES } from "./coverMeta";

export interface ItemPatch {
  notes?: string;
  releaseDate?: string;
  price?: string;
  type?: string;
}

/**
 * Per-item detail editor. Fields shown depend on list type, mirroring the
 * web LibraryLoanList / BookLedgerList / BookListItems inputs. Saves live:
 * text fields debounce, discrete choices save immediately, and any pending
 * text edit is flushed on close.
 */
export function ItemEditorSheet({
  open,
  item,
  listType,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  item: ListItem | null;
  listType: string;
  onClose: () => void;
  onSave: (patch: ItemPatch) => void;
  onRemove: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!item) return;
    setNotes(item.notes ?? "");
    setReleaseDate(item.releaseDate ?? "");
    setPrice(item.price ?? "");
    setType(item.type ?? "");
  }, [item]);

  const isLoan = listType === "library_loan";
  const isLedger = listType === "book_ledger";

  // Debounced text save (notes / date / price).
  const queueSave = (patch: ItemPatch) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(patch), 500);
  };

  const flushAndClose = () => {
    if (timer.current) clearTimeout(timer.current);
    onSave({ notes, releaseDate, price, type });
    onClose();
  };

  if (!item) {
    return (
      <SheetModal open={open} onClose={onClose}>
        <></>
      </SheetModal>
    );
  }

  const notesLabel = isLoan ? "call number" : isLedger ? "from / to" : "note";
  const notesPlaceholder = isLoan
    ? "e.g. FIC ROW"
    : isLedger
      ? "source or destination…"
      : "add a note…";

  return (
    <SheetModal open={open} onClose={flushAndClose}>
      <Text style={sheetStyles.title}>{item.title}</Text>
      {item.author ? (
        <Text style={sheetStyles.subtitle}>{item.author}</Text>
      ) : null}

      {/* Status / transaction type */}
      {isLoan ? (
        <>
          <Text style={sheetStyles.fieldLabel}>status</Text>
          <Segmented
            options={LOAN_STATUSES.map((s) => s.label)}
            values={LOAN_STATUSES.map((s) => s.value)}
            value={type}
            onChange={(v) => {
              setType(v);
              onSave({ type: v });
            }}
          />
        </>
      ) : null}

      {isLedger ? (
        <>
          <Text style={sheetStyles.fieldLabel}>transaction</Text>
          <Segmented
            options={TX_TYPES}
            values={TX_TYPES}
            value={type || "bought"}
            onChange={(v) => {
              setType(v);
              onSave({ type: v });
            }}
          />
        </>
      ) : null}

      {/* Notes / call # / from-to */}
      <Text style={sheetStyles.fieldLabel}>{notesLabel}</Text>
      <TextInput
        value={notes}
        onChangeText={(v) => {
          setNotes(v);
          queueSave({ notes: v });
        }}
        placeholder={notesPlaceholder}
        placeholderTextColor={C.fgFaint}
        style={sheetStyles.input}
      />

      {/* Price (loan = amount saved, ledger = price) */}
      {isLoan || isLedger ? (
        <>
          <Text style={sheetStyles.fieldLabel}>
            {isLoan ? "amount saved ($)" : "price ($)"}
          </Text>
          <TextInput
            value={price}
            onChangeText={(v) => {
              setPrice(v);
              queueSave({ price: v });
            }}
            placeholder="0.00"
            placeholderTextColor={C.fgFaint}
            keyboardType="decimal-pad"
            style={sheetStyles.input}
          />
        </>
      ) : null}

      {/* Date (loan = due, ledger = transaction date) */}
      {isLoan || isLedger ? (
        <>
          <Text style={sheetStyles.fieldLabel}>
            {isLoan ? "due date" : "date"}
          </Text>
          <TextInput
            value={releaseDate}
            onChangeText={(v) => {
              setReleaseDate(v);
              queueSave({ releaseDate: v });
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.fgFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={sheetStyles.input}
          />
        </>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <Text style={styles.removeText}>remove item</Text>
        </Pressable>
        <Pressable onPress={flushAndClose} style={sheetStyles.primaryBtn}>
          <Text style={sheetStyles.primaryText}>done</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}

function Segmented({
  options,
  values,
  value,
  onChange,
}: {
  options: readonly string[];
  values: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((label, i) => {
        const v = values[i];
        const active = value === v;
        return (
          <Pressable
            key={v || label}
            onPress={() => onChange(v)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
  segmentActive: { backgroundColor: C.plum, borderColor: C.plum },
  segmentText: { fontSize: 12, color: C.fgMid, letterSpacing: 0.1 },
  segmentTextActive: { color: C.cream },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  removeBtn: { paddingVertical: 8, paddingRight: 12 },
  removeText: { fontSize: 13, color: "#b03a2e", letterSpacing: 0.2 },
});
