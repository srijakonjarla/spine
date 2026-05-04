import { Pressable, Text, View } from "react-native";
import { homeStyles as s } from "./styles";

export type Entry = {
  id: string;
  date: string; // already-formatted "READING APR 19"
  title: string;
  note: string;
  footer: string; // "p. 519 · 22 mins"
};

export function RecentEntries({
  entries,
  onSeeAll,
}: {
  entries: Entry[];
  onSeeAll?: () => void;
}) {
  if (entries.length === 0) return null;
  return (
    <View>
      <View style={s.sectionTitleRow}>
        <Text style={s.sectionHand}>recent entries</Text>
        <Pressable onPress={onSeeAll} hitSlop={6}>
          <Text style={s.sectionLink}>see all →</Text>
        </Pressable>
      </View>

      {entries.map((e) => (
        <Pressable key={e.id} style={s.entryCard}>
          <Text style={s.entryDate}>{e.date}</Text>
          <Text style={s.entryTitle}>{e.title}</Text>
          <Text style={s.entryNote}>{e.note}</Text>
          <Text style={s.entryFooter}>{e.footer}</Text>
        </Pressable>
      ))}
    </View>
  );
}
