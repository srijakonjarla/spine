import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BookEntry } from "@spine/shared";
import { SheetModal, sheetStyles as m } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";
import { fetchCoverEditions, type CoverEdition } from "@/lib/library";

/** Lets the user swap the cover for another edition's (web's CoverPickerModal). */
export function CoverPickerSheet({
  open,
  entry,
  onClose,
  onSelect,
}: {
  open: boolean;
  entry: BookEntry;
  onClose: () => void;
  onSelect: (coverUrl: string) => void;
}) {
  const [editions, setEditions] = useState<CoverEdition[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { hardcoverBookId, isbn, title, author } = entry;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setEditions(null);
    setFailed(false);
    fetchCoverEditions({ hardcoverBookId, isbn, title, author })
      .then((eds) => {
        if (!cancelled) setEditions(eds);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setEditions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, hardcoverBookId, isbn, title, author]);

  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={m.title}>change cover</Text>
      <Text style={m.subtitle}>pick a different edition&apos;s cover</Text>

      {editions === null ? (
        <View style={s.status}>
          <ActivityIndicator color={C.fgMuted} />
        </View>
      ) : editions.length === 0 ? (
        <Text style={s.empty}>
          {failed
            ? "couldn't load editions — try again later."
            : "no other editions found."}
        </Text>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.grid}>
          {editions.map((ed) => {
            const current = ed.coverUrl === entry.coverUrl;
            return (
              <Pressable
                key={ed.id || ed.coverUrl}
                onPress={() => onSelect(ed.coverUrl)}
                accessibilityLabel={
                  ed.publisher ? `${ed.publisher} edition` : "edition cover"
                }
                style={({ pressed }) => [
                  s.cell,
                  current && s.cellCurrent,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Image
                  source={{ uri: ed.coverUrl }}
                  style={s.cover}
                  resizeMode="cover"
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={m.actionsRow}>
        <Pressable onPress={onClose} style={m.cancelBtn} hitSlop={6}>
          <Text style={m.cancelText}>cancel</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}

const s = StyleSheet.create({
  status: { paddingVertical: 32, alignItems: "center" },
  empty: {
    fontSize: 13,
    color: C.fgFaint,
    textAlign: "center",
    paddingVertical: 28,
  },
  scroll: { maxHeight: 420 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: {
    width: "22.5%",
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: C.paperDeep,
  },
  cellCurrent: { borderColor: C.plum },
  cover: { width: "100%", height: "100%" },
});
