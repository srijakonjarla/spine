import { Platform, StyleSheet, Text, View } from "react-native";
import type { BookList } from "@spine/shared";
import { C, RGB, alpha } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

/** Aggregate counters strip for library_loan lists. */
export function LoanStats({ list, today }: { list: BookList; today: string }) {
  const out = list.items.filter((i) => i.type !== "returned").length;
  const returned = list.items.filter((i) => i.type === "returned").length;
  const overdue = list.items.filter(
    (i) => i.releaseDate && i.releaseDate < today && i.type !== "returned",
  ).length;
  const saved = list.items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  return (
    <View style={styles.row}>
      <Stat label="out" value={String(out)} color={C.terraInk} />
      <Stat label="returned" value={String(returned)} color={C.sageDeep} />
      {overdue > 0 ? (
        <Stat label="overdue" value={String(overdue)} color={C.danger} />
      ) : null}
      {saved > 0 ? (
        <Stat label="saved" value={`$${saved.toFixed(0)}`} color={C.sageDeep} />
      ) : null}
    </View>
  );
}

/** Aggregate counters strip for book_ledger lists. */
export function LedgerStats({ list }: { list: BookList }) {
  const spent = list.items
    .filter((i) => i.type === "bought" || i.type === "gifted")
    .reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  const earned = list.items
    .filter((i) => i.type === "sold")
    .reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  return (
    <View style={styles.row}>
      <Stat label="spent" value={`$${spent.toFixed(0)}`} color={C.terraInk} />
      <Stat label="earned" value={`$${earned.toFixed(0)}`} color={C.sageDeep} />
      {earned > 0 ? (
        <Stat
          label="net"
          value={`${earned - spent >= 0 ? "+" : "−"}$${Math.abs(earned - spent).toFixed(0)}`}
          color={earned - spent >= 0 ? C.sageDeep : C.terraInk}
        />
      ) : null}
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginBottom: 16 },
  cell: {
    flex: 1,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: alpha(RGB.plum, 0.08),
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  value: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: C.fgMuted,
    textTransform: "uppercase",
    marginTop: 3,
  },
});
