import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatDate, type ListItem } from "@spine/shared";
import { C, RGB, alpha } from "@/components/login/tokens";
import { rowStyles } from "./rowStyles";
import { STATUS_PILL } from "./statusPill";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

const TX_COLOR: Record<string, string> = {
  bought: C.plum,
  sold: C.sageDeep,
  gifted: C.gold,
  donated: C.fgMuted,
};

/**
 * Returns the badge label + accent color for a library_loan item.
 * "overdue" is derived from the due date — not stored as its own type.
 */
function loanBadge(item: ListItem, today: string) {
  if (item.type === "returned") return { label: "returned", color: C.sageDeep };
  if (item.type === "renewed") return { label: "renewed", color: C.gold };
  if (item.releaseDate && item.releaseDate < today)
    return { label: "overdue", color: C.danger };
  return { label: "out", color: C.fgMuted };
}

/**
 * Row for book / library_loan / book_ledger lists. Compact by design —
 * tap to open the item editor sheet for full per-type fields; long-press
 * or the trailing × removes. Right-side badge and meta line adapt per type.
 */
export function BookRow({
  item,
  listType,
  status,
  today,
  onPress,
  onRemove,
}: {
  item: ListItem;
  listType: string;
  /** Reading status from the user's library (book_list only). */
  status?: string;
  today: string;
  onPress: () => void;
  onRemove: () => void;
}) {
  const isLoan = listType === "library_loan";
  const isLedger = listType === "book_ledger";
  const returned = isLoan && item.type === "returned";

  let badge: { label: string; color: string } | null = null;
  let meta = "";
  if (isLoan) {
    badge = loanBadge(item, today);
    meta = [
      item.releaseDate && `due ${formatDate(item.releaseDate)}`,
      item.notes && `#${item.notes}`,
      item.price && `saved $${item.price}`,
    ]
      .filter(Boolean)
      .join(" · ");
  } else if (isLedger) {
    const tx = item.type || "bought";
    badge = { label: tx, color: TX_COLOR[tx] ?? C.plum };
    meta = [
      item.price && `$${item.price}`,
      item.notes,
      item.releaseDate && formatDate(item.releaseDate),
    ]
      .filter(Boolean)
      .join(" · ");
  } else {
    badge = status ? STATUS_PILL[status] : null;
    meta = item.notes ?? "";
  }

  return (
    <Pressable onPress={onPress} onLongPress={onRemove} style={styles.row}>
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={styles.thumbInitial}>
            {item.title.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, returned && styles.titleReturned]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {badge ? (
            <View style={[styles.pill, { borderColor: badge.color }]}>
              <Text style={[styles.pillText, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
          ) : null}
        </View>
        {item.author ? (
          <Text style={styles.author} numberOfLines={1}>
            {item.author}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : (
          <Text style={styles.hint}>tap to add details</Text>
        )}
      </View>
      <Pressable onPress={onRemove} hitSlop={8} style={rowStyles.removeBtn}>
        <Text style={rowStyles.removeX}>×</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: alpha(RGB.plum, 0.06),
  },
  thumb: {
    width: 44,
    height: 66,
    borderRadius: 4,
    backgroundColor: C.paperDeep,
  },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  thumbInitial: { fontFamily: SERIF, fontSize: 18, color: C.fgFaint },
  body: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: {
    flex: 1,
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  titleReturned: {
    color: C.fgMuted,
    textDecorationLine: "line-through",
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "lowercase",
  },
  author: { fontSize: 13, color: C.fgMuted, marginTop: 2 },
  meta: {
    fontSize: 11,
    color: C.terraInk,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  hint: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 12,
    color: C.fgFaint,
    marginTop: 4,
  },
});
