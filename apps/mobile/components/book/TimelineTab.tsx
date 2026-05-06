import { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  formatDate,
  localDateStr,
  parseLocalDate,
  type BookEntry,
  type Thought,
} from "@spine/shared";
import { BookOpenIcon, LeafIcon, MoonIcon, SunIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";
import { addThought, removeThought } from "@/lib/library";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });
const DAY_STRIP_THRESHOLD = 5;

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function timeOfDay(iso: string): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function TimeOfDayIcon({ iso, size = 14 }: { iso: string; size?: number }) {
  const slot = timeOfDay(iso);
  const color = "#7b9e87";
  if (slot === "morning") return <SunIcon size={size} color={color} />;
  if (slot === "afternoon") return <BookOpenIcon size={size} color={color} />;
  if (slot === "evening") return <LeafIcon size={size} color={color} />;
  return <MoonIcon size={size} color={color} />;
}

export function TimelineTab({
  entry,
  onEntryChange,
}: {
  entry: BookEntry;
  onEntryChange: (next: BookEntry) => void;
}) {
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [pageDraft, setPageDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [stripExpanded, setStripExpanded] = useState(false);

  const thoughts = useMemo(() => entry.thoughts ?? [], [entry.thoughts]);

  const calendarDays = useMemo(() => {
    if (!entry.dateStarted) return [];
    const start = parseLocalDate(entry.dateStarted);
    const end = entry.dateFinished
      ? parseLocalDate(entry.dateFinished)
      : new Date();
    if (!start || !end) return [];
    const days: { dateStr: string; day: number }[] = [];
    const d = new Date(start);
    while (d <= end) {
      days.push({ dateStr: localDateStr(d), day: d.getDate() });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [entry.dateStarted, entry.dateFinished]);

  const sortedThoughts = useMemo(() => {
    const arr = activeDay
      ? thoughts.filter(
          (t) => localDateStr(new Date(t.createdAt)) === activeDay,
        )
      : thoughts;
    return [...arr].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [thoughts, activeDay]);

  const pageDeltas = useMemo(() => {
    const asc = [...thoughts]
      .filter((t) => t.pageNumber != null)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    const map = new Map<string, { from: number; to: number; delta: number }>();
    for (let i = 0; i < asc.length; i++) {
      const prev = i > 0 ? (asc[i - 1].pageNumber ?? 0) : 0;
      const to = asc[i].pageNumber ?? 0;
      map.set(asc[i].id, { from: prev, to, delta: Math.max(0, to - prev) });
    }
    return map;
  }, [thoughts]);

  const post = useCallback(async () => {
    const text = noteDraft.trim();
    if (!text || posting) return;
    const pageNumber = pageDraft.trim()
      ? Number.parseInt(pageDraft.trim(), 10)
      : null;
    const newThought: Thought = {
      id: uuid(),
      text,
      pageNumber:
        pageNumber !== null && Number.isFinite(pageNumber) ? pageNumber : null,
      createdAt: new Date().toISOString(),
    };
    setPosting(true);
    onEntryChange({ ...entry, thoughts: [...thoughts, newThought] });
    setNoteDraft("");
    setPageDraft("");
    try {
      await addThought(entry.id, {
        id: newThought.id,
        text: newThought.text,
        pageNumber: newThought.pageNumber ?? null,
        createdAt: newThought.createdAt,
      });
    } catch {
      onEntryChange(entry);
    } finally {
      setPosting(false);
    }
  }, [entry, noteDraft, onEntryChange, pageDraft, posting, thoughts]);

  const handleDelete = useCallback(
    async (id: string) => {
      const prev = thoughts;
      onEntryChange({
        ...entry,
        thoughts: thoughts.filter((t) => t.id !== id),
      });
      try {
        await removeThought(entry.id, id);
      } catch {
        onEntryChange({ ...entry, thoughts: prev });
      }
    },
    [entry, onEntryChange, thoughts],
  );

  const finishedDay = entry.dateFinished
    ? localDateStr(parseLocalDate(entry.dateFinished) ?? new Date())
    : null;
  const loggedDays = useMemo(() => {
    const set = new Set<string>();
    for (const t of thoughts) set.add(localDateStr(new Date(t.createdAt)));
    return set;
  }, [thoughts]);

  const collapsed = calendarDays.length > DAY_STRIP_THRESHOLD && !stripExpanded;
  const visibleDays = collapsed
    ? [calendarDays[0], null, ...calendarDays.slice(-4)]
    : calendarDays;
  const hiddenCount = calendarDays.length - 5;

  return (
    <View>
      <Text style={s.dayStripLabel}>days you spent with this book</Text>
      {calendarDays.length > 0 ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.dayStrip}
          >
            {visibleDays.map((d, i) => {
              if (d == null) {
                return (
                  <Pressable
                    key="ellipsis"
                    onPress={() => setStripExpanded(true)}
                    style={[s.dayChip, s.dayChipEllipsis]}
                    hitSlop={4}
                  >
                    <Text style={s.dayChipEllipsisText}>+{hiddenCount}</Text>
                  </Pressable>
                );
              }
              const active = d.dateStr === activeDay;
              const isFinished = d.dateStr === finishedDay;
              const isLogged = loggedDays.has(d.dateStr);
              return (
                <Pressable
                  key={d.dateStr + i}
                  onPress={() => setActiveDay(active ? null : d.dateStr)}
                  style={[
                    s.dayChip,
                    isLogged && !active && s.dayChipLogged,
                    isFinished && !active && s.dayChipFinished,
                    active && s.dayChipActive,
                  ]}
                >
                  <Text style={[s.dayChipText, active && s.dayChipTextActive]}>
                    {d.day}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={s.legendRow}>
            <View style={s.legendItem}>
              <View style={[s.legendSwatch, s.legendSwatchLogged]} />
              <Text style={s.legendText}>logged</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendSwatch, s.legendSwatchFinished]} />
              <Text style={s.legendText}>finished</Text>
            </View>
          </View>
        </>
      ) : null}

      {sortedThoughts.length === 0 ? (
        <Text style={s.emptyHint}>
          {activeDay ? "no notes that day." : "no reading notes yet."}
        </Text>
      ) : (
        <View style={s.entriesList}>
          {sortedThoughts.map((t, i) => {
            const delta = pageDeltas.get(t.id);
            const isLast = i === sortedThoughts.length - 1;
            return (
              <View key={t.id} style={s.entryRow}>
                <View style={s.rail}>
                  <View style={s.railDot} />
                  {!isLast ? <View style={s.railLine} /> : null}
                </View>
                <View style={s.entryBody}>
                  <View style={s.entryMeta}>
                    <Text style={s.entryDate}>
                      {formatDate(t.createdAt, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <TimeOfDayIcon iso={t.createdAt} />
                    {delta && delta.delta > 0 ? (
                      <Text style={s.entryPages}>
                        p.{delta.from} → {delta.to}
                      </Text>
                    ) : t.pageNumber ? (
                      <Text style={s.entryPages}>p.{t.pageNumber}</Text>
                    ) : null}
                    <View style={{ flex: 1 }} />
                    {delta && delta.delta > 0 ? (
                      <View style={s.pagesPill}>
                        <Text style={s.pagesPillText}>{delta.delta} pages</Text>
                      </View>
                    ) : null}
                    <Pressable hitSlop={6} onPress={() => handleDelete(t.id)}>
                      <Text style={s.entryDelete}>×</Text>
                    </Pressable>
                  </View>
                  <Text style={s.entryText}>{t.text}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={s.composer}>
        <View style={s.composerRow}>
          <TextInput
            value={pageDraft}
            onChangeText={setPageDraft}
            placeholder="p."
            placeholderTextColor={C.fgFaint}
            keyboardType="number-pad"
            style={s.composerPage}
          />
          <TextInput
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="add a reading note…"
            placeholderTextColor={C.fgFaint}
            multiline
            style={s.composerNote}
          />
        </View>
        <Pressable
          onPress={post}
          disabled={posting || !noteDraft.trim()}
          style={({ pressed }) => [
            s.composerPost,
            (posting || !noteDraft.trim()) && { opacity: 0.4 },
            pressed && { backgroundColor: C.terraPressed },
          ]}
        >
          <Text style={s.composerPostText}>
            {posting ? "posting…" : "post"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dayStripLabel: {
    fontFamily: SERIF,
    fontSize: 14,
    fontStyle: "italic",
    color: C.fgMuted,
    marginBottom: 14,
    letterSpacing: 0.1,
  },
  dayStrip: { gap: 8, paddingVertical: 4 },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
  dayChipLogged: {
    backgroundColor: "rgba(123,158,135,0.18)",
    borderColor: "rgba(123,158,135,0.35)",
  },
  dayChipFinished: { backgroundColor: C.terraInk, borderColor: C.terraInk },
  dayChipActive: { backgroundColor: C.terraInk, borderColor: C.terraInk },
  dayChipText: { fontSize: 13, color: C.fg, fontWeight: "500" },
  dayChipTextActive: { color: C.cream },
  dayChipEllipsis: {
    backgroundColor: C.paper,
    borderColor: C.line,
    borderStyle: "dashed",
  },
  dayChipEllipsisText: {
    fontSize: 11,
    color: C.fgFaint,
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  legendRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 12,
    marginBottom: 22,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendSwatchLogged: { backgroundColor: "rgba(123,158,135,0.35)" },
  legendSwatchFinished: { backgroundColor: C.terraInk },
  legendText: { fontSize: 11, color: C.fgMuted, letterSpacing: 0.3 },

  emptyHint: {
    fontSize: 12,
    color: C.fgFaint,
    fontStyle: "italic",
    paddingVertical: 18,
    textAlign: "center",
  },

  entriesList: { gap: 6, marginBottom: 22 },
  entryRow: { flexDirection: "row", gap: 12 },
  rail: { width: 16, alignItems: "center" },
  railDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.25,
    borderColor: C.terraInk,
    backgroundColor: C.cream,
    marginTop: 2,
  },
  railLine: {
    flex: 1,
    width: 1,
    backgroundColor: C.line,
    marginTop: 2,
    marginBottom: 2,
  },
  entryBody: { flex: 1, paddingBottom: 18, gap: 6 },
  entryMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  entryDate: {
    fontFamily: SERIF,
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "500",
    color: C.terraInk,
  },
  entryPages: { fontSize: 12, color: C.fgMuted, letterSpacing: 0.2 },
  pagesPill: {
    backgroundColor: "rgba(123,158,135,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pagesPillText: {
    fontSize: 11,
    color: "#5e7e6c",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  entryDelete: { fontSize: 18, color: C.fgFaint, paddingHorizontal: 4 },
  entryText: {
    fontFamily: SERIF,
    fontSize: 14,
    fontStyle: "italic",
    color: C.fg,
    lineHeight: 22,
  },
  composer: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: C.paper,
    padding: 12,
    gap: 10,
  },
  composerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  composerPage: {
    width: 56,
    fontSize: 13,
    color: C.fg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: C.cream,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  composerNote: {
    flex: 1,
    fontSize: 13,
    color: C.fg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: C.cream,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 60,
  },
  composerPost: {
    alignSelf: "flex-end",
    backgroundColor: C.terraInk,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  composerPostText: {
    color: C.cream,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
