import { Platform, StyleSheet, Text, View } from "react-native";
import { formatDate, type BookEntry } from "@spine/shared";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export function DetailsTab({ entry }: { entry: BookEntry }) {
  const rows: { label: string; value: string }[] = [];
  if ((entry.pageCount ?? 0) > 0)
    rows.push({ label: "Pages", value: String(entry.pageCount) });
  if (entry.releaseDate)
    rows.push({ label: "Published", value: formatDate(entry.releaseDate) });
  if (entry.genres?.length)
    rows.push({ label: "Genre", value: entry.genres.join(" / ") });
  if (entry.dateStarted)
    rows.push({ label: "Started", value: formatDate(entry.dateStarted) });
  if (entry.dateFinished)
    rows.push({ label: "Finished", value: formatDate(entry.dateFinished) });
  if (entry.dateDnfed)
    rows.push({ label: "DNF'd", value: formatDate(entry.dateDnfed) });
  if (entry.dateShelved && entry.status !== "did-not-finish")
    rows.push({ label: "Shelved", value: formatDate(entry.dateShelved) });
  if (entry.format) rows.push({ label: "Format", value: entry.format });
  if (entry.publisher)
    rows.push({ label: "Publisher", value: entry.publisher });
  if (entry.isbn) rows.push({ label: "ISBN", value: entry.isbn });

  return (
    <View>
      <Text style={s.sectionLabel}>all this metadata</Text>
      <View style={s.card}>
        {rows.map((r, i) => (
          <View
            key={r.label}
            style={[s.row, i === rows.length - 1 && s.rowLast]}
          >
            <Text style={s.label}>{r.label}</Text>
            <Text style={s.value} numberOfLines={1}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sectionLabel: {
    fontFamily: SERIF,
    fontSize: 13,
    fontStyle: "italic",
    color: C.fgMuted,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  card: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: C.paper,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 13, color: C.fgMuted },
  value: {
    fontSize: 13,
    color: C.fg,
    maxWidth: "60%",
    textAlign: "right",
  },
});
