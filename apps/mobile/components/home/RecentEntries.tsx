import { Pressable, Text, View } from "react-native";
import { homeStyles as s } from "./styles";

export type Entry = {
  id: string;
  date: string; // already-formatted "READING APR 19"
  title?: string;
  note: string;
  footer: string; // "p. 519 · 22 mins"
};

export function RecentEntries({
  entries,
  onSeeAll,
  onSelect,
}: {
  entries: Entry[];
  onSeeAll?: () => void;
  onSelect?: (entry: Entry) => void;
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
        <Pressable key={e.id} style={s.entryCard} onPress={() => onSelect?.(e)}>
          <Text style={s.entryDate}>{e.date}</Text>
          {e.title ? <Text style={s.entryTitle}>{e.title}</Text> : null}
          <Text style={s.entryNote}>{e.note}</Text>
          <Text style={s.entryFooter}>{e.footer}</Text>
        </Pressable>
      ))}
    </View>
  );
}
