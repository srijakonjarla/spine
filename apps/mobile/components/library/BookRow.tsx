import { StyleSheet, Text, View } from "react-native";
import type { BookEntry } from "@spine/shared";
import { C } from "@/components/login/tokens";
import { StatusCircle, type StatusVariant } from "./StatusCircle";

const SYMBOL_TO_VARIANT: Record<string, StatusVariant> = {
  "○": "ring",
  "◌": "dashed",
  "●": "filled",
};

export function BookRow({
  entry,
  symbol,
  symbolColor,
}: {
  entry: BookEntry;
  symbol: string;
  symbolColor: string;
}) {
  const variant = SYMBOL_TO_VARIANT[symbol] ?? "ring";
  return (
    <View style={s.row}>
      <View style={s.symbolSlot}>
        <StatusCircle variant={variant} color={symbolColor} />
      </View>
      <Text style={s.rowTitle} numberOfLines={1}>
        {entry.title || "untitled"}
      </Text>
      {entry.author ? (
        <Text style={s.rowAuthor} numberOfLines={1}>
          {entry.author}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  symbolSlot: {
    width: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { flex: 1, fontSize: 14, color: C.fg },
  rowAuthor: { fontSize: 11, color: C.fgFaint, maxWidth: 120 },
});
