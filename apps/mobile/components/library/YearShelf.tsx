import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { BookEntry } from "@spine/shared";
import { BookCoverThumb } from "./BookCoverThumb";
import { BookRow } from "./BookRow";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export type ShelfGroup =
  | { kind: "year"; year: number; books: BookEntry[] }
  | { kind: "earlier"; books: BookEntry[] };

export function YearShelf({
  group,
  viewMode,
  tileWidth,
  tileHeight,
}: {
  group: ShelfGroup;
  viewMode: "grid" | "list";
  tileWidth: number;
  tileHeight: number;
}) {
  const router = useRouter();
  const label = group.kind === "year" ? group.year : "earlier";
  return (
    <View style={s.yearBlock}>
      <View style={s.shelfDivider}>
        <View style={s.dividerLine} />
        <Text style={s.yearLabel}>
          {label} · {group.books.length}
        </Text>
        <View style={s.dividerLine} />
      </View>
      {viewMode === "list" ? (
        <View style={s.list}>
          {group.books.map((b) => (
            <Pressable key={b.id} onPress={() => router.push(`/book/${b.id}`)}>
              <BookRow entry={b} symbol="●" symbolColor={C.fgFaint} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={s.grid}>
          {group.books.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/book/${b.id}`)}
              style={[s.gridItem, { width: tileWidth }]}
            >
              <BookCoverThumb
                coverUrl={b.coverUrl}
                title={b.title || "untitled"}
                author={b.author}
                width={tileWidth}
                height={tileHeight}
              />
              <Text style={s.gridTitle} numberOfLines={2}>
                {b.title || "untitled"}
              </Text>
              {b.author ? (
                <Text style={s.gridAuthor} numberOfLines={1}>
                  {b.author}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  yearBlock: { marginBottom: 20 },
  shelfDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    marginBottom: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  yearLabel: {
    fontFamily: SERIF,
    fontSize: 12,
    color: C.fgMuted,
    letterSpacing: 0.4,
  },
  list: { marginTop: 4, gap: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: { gap: 6 },
  gridTitle: {
    fontSize: 12,
    color: C.fg,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  gridAuthor: { fontSize: 10, color: C.fgFaint },
});
