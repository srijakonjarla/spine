import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  fmtHours,
  formatDate,
  formatReadRange,
  localDateStr,
  parseLocalDate,
  type BookEntry,
} from "@spine/shared";
import { C } from "@/components/login/tokens";
import { Stars } from "@/components/ui/Stars";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

const FORMATS = [
  "hardcover",
  "paperback",
  "trade paperback",
  "ebook",
  "audiobook",
  "large print",
];

export interface PastReadDraft {
  dateStarted: string;
  dateFinished: string;
  rating: number;
  feeling: string;
}

export function DetailsTab({
  entry,
  onPatch,
  onLogRead,
  onDeleteRead,
  onDelete,
}: {
  entry: BookEntry;
  onPatch: (p: Partial<BookEntry>) => void;
  onLogRead: (read: PastReadDraft) => Promise<void>;
  onDeleteRead: (readId: string) => Promise<void>;
  onDelete: () => void;
}) {
  const rows: { label: string; value: string }[] = [];
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
  if (entry.publisher)
    rows.push({ label: "Publisher", value: entry.publisher });
  if (entry.audioDurationMinutes != null)
    rows.push({
      label: "Audio",
      value: fmtHours(entry.audioDurationMinutes),
    });
  if (entry.isbn) rows.push({ label: "ISBN", value: entry.isbn });

  const confirmDelete = () =>
    Alert.alert(
      "delete entry",
      `remove "${entry.title}" and its notes from your library? this can't be undone.`,
      [
        { text: "cancel", style: "cancel" },
        { text: "delete", style: "destructive", onPress: onDelete },
      ],
    );

  return (
    <View style={{ gap: 22 }}>
      <View>
        <Text style={s.sectionLabel}>the basics</Text>
        <View style={[s.card, s.cardPad]}>
          <CommitField
            label="Title"
            value={entry.title}
            onCommit={(title) => title && onPatch({ title })}
            serif
          />
          <CommitField
            label="Author"
            value={entry.author}
            onCommit={(author) => onPatch({ author })}
          />
          <CommitField
            label="Pages"
            value={entry.pageCount ? String(entry.pageCount) : ""}
            placeholder="add page count"
            numeric
            onCommit={(v) => {
              const n = parseInt(v, 10);
              onPatch({ pageCount: n > 0 ? n : null });
            }}
          />
        </View>
      </View>

      <View>
        <Text style={s.sectionLabel}>format</Text>
        <View style={s.chips}>
          {FORMATS.map((f) => {
            const active = entry.format === f;
            return (
              <Pressable
                key={f}
                onPress={() => onPatch({ format: active ? "" : f })}
                style={[s.chip, active && s.chipActive]}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.hint}>
          library checkouts and acquisition source are tracked via your lists.
        </Text>
      </View>

      <DiversityTags entry={entry} onPatch={onPatch} />

      {rows.length > 0 ? (
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
      ) : null}

      <ReadHistory
        entry={entry}
        onLogRead={onLogRead}
        onDeleteRead={onDeleteRead}
      />

      <View style={[s.card, s.cardPad]}>
        <Text style={s.hint}>
          updated{" "}
          {new Date(entry.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        <Pressable hitSlop={8} onPress={confirmDelete}>
          <Text style={s.danger}>delete entry</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Text field that keeps local state and saves on blur / submit. */
function CommitField({
  label,
  value,
  placeholder,
  numeric,
  serif,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  numeric?: boolean;
  serif?: boolean;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const v = draft.trim();
    if (v !== value) onCommit(v);
  };
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={draft}
        onChangeText={(v) => setDraft(numeric ? v.replace(/\D/g, "") : v)}
        onEndEditing={commit}
        onSubmitEditing={commit}
        placeholder={placeholder}
        placeholderTextColor={C.fgFaint}
        keyboardType={numeric ? "number-pad" : "default"}
        returnKeyType="done"
        style={[s.input, serif && { fontFamily: SERIF, fontSize: 17 }]}
      />
    </View>
  );
}

function DiversityTags({
  entry,
  onPatch,
}: {
  entry: BookEntry;
  onPatch: (p: Partial<BookEntry>) => void;
}) {
  const [input, setInput] = useState("");
  const userTags = entry.userDiversityTags ?? [];
  const catalogTags = (entry.diversityTags ?? []).filter(
    (t) => !userTags.includes(t),
  );

  const add = () => {
    const t = input.trim();
    setInput("");
    if (!t || userTags.includes(t)) return;
    onPatch({
      diversityTags: [...new Set([...(entry.diversityTags ?? []), t])],
      userDiversityTags: [...userTags, t],
    });
  };
  const remove = (t: string) =>
    onPatch({
      diversityTags: (entry.diversityTags ?? []).filter((x) => x !== t),
      userDiversityTags: userTags.filter((x) => x !== t),
    });

  return (
    <View>
      <Text style={s.sectionLabel}>diversity tags</Text>
      {catalogTags.length > 0 ? (
        <>
          <Text style={s.miniLabel}>from hardcover</Text>
          <View style={[s.chips, { marginBottom: 10 }]}>
            {catalogTags.map((t) => (
              <View key={t} style={s.chip}>
                <Text style={s.chipText}>{t}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      {userTags.length > 0 ? (
        <View style={[s.chips, { marginBottom: 10 }]}>
          {userTags.map((t) => (
            <Pressable
              key={t}
              onPress={() => remove(t)}
              style={[s.chip, s.chipActive]}
            >
              <Text style={[s.chipText, s.chipTextActive]}>{t} ×</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        value={input}
        onChangeText={setInput}
        onSubmitEditing={add}
        placeholder="add your own — own voices, translated…"
        placeholderTextColor={C.fgFaint}
        returnKeyType="done"
        style={s.input}
      />
    </View>
  );
}

function ReadHistory({
  entry,
  onLogRead,
  onDeleteRead,
}: {
  entry: BookEntry;
  onLogRead: (read: PastReadDraft) => Promise<void>;
  onDeleteRead: (readId: string) => Promise<void>;
}) {
  const [logging, setLogging] = useState(false);
  const [finished, setFinished] = useState(localDateStr());
  const [rating, setRating] = useState(0);
  const [feeling, setFeeling] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!parseLocalDate(finished)) {
      Alert.alert("hmm", "enter the finish date as yyyy-mm-dd.");
      return;
    }
    setSaving(true);
    try {
      await onLogRead({
        dateStarted: "",
        dateFinished: finished,
        rating,
        feeling: feeling.trim(),
      });
      setLogging(false);
      setRating(0);
      setFeeling("");
    } catch {
      Alert.alert("couldn't log read", "try again later.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRead = (readId: string) =>
    Alert.alert("delete read", "remove this read from your history?", [
      { text: "cancel", style: "cancel" },
      {
        text: "delete",
        style: "destructive",
        onPress: () =>
          onDeleteRead(readId).catch(() =>
            Alert.alert("couldn't delete read", "try again later."),
          ),
      },
    ]);

  return (
    <View>
      <Text style={s.sectionLabel}>read history</Text>
      <View style={[s.card, s.cardPad, { gap: 12 }]}>
        <View style={s.readRow}>
          <Text style={s.readRange}>{formatReadRange(entry)}</Text>
          <Text style={s.readStatus}>· {entry.status.replace(/-/g, " ")}</Text>
          <Stars rating={entry.rating} size={11} />
          {entry.status === "reading" ? (
            <Text style={s.current}>← current</Text>
          ) : null}
        </View>
        {[...entry.reads].reverse().map((read) => (
          <View key={read.id} style={s.pastRead}>
            <View style={{ flex: 1 }}>
              <View style={s.readRow}>
                <Text style={s.readRange}>{formatReadRange(read)}</Text>
                <Text style={s.readStatus}>
                  · {read.status.replace(/-/g, " ")}
                </Text>
                <Stars rating={read.rating} size={11} />
              </View>
              {read.feeling ? (
                <Text style={s.feeling}>{read.feeling}</Text>
              ) : null}
            </View>
            <Pressable hitSlop={8} onPress={() => confirmDeleteRead(read.id)}>
              <Text style={s.remove}>×</Text>
            </Pressable>
          </View>
        ))}

        {logging ? (
          <View style={s.logForm}>
            <Text style={s.fieldLabel}>finished on</Text>
            <TextInput
              value={finished}
              onChangeText={setFinished}
              placeholder="yyyy-mm-dd"
              placeholderTextColor={C.fgFaint}
              keyboardType="numbers-and-punctuation"
              style={s.input}
            />
            <Text style={s.fieldLabel}>rating</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  hitSlop={4}
                  onPress={() => setRating(rating === n ? 0 : n)}
                >
                  <Text
                    style={{
                      fontSize: 22,
                      color: n <= rating ? C.gold : C.line,
                    }}
                  >
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={feeling}
              onChangeText={setFeeling}
              placeholder="how did it feel? (optional)"
              placeholderTextColor={C.fgFaint}
              style={s.input}
            />
            <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
              <Pressable
                onPress={save}
                disabled={saving}
                style={[s.saveBtn, saving && { opacity: 0.5 }]}
              >
                <Text style={s.saveText}>
                  {saving ? "saving…" : "log read"}
                </Text>
              </Pressable>
              <Pressable onPress={() => setLogging(false)}>
                <Text style={s.hint}>cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable hitSlop={8} onPress={() => setLogging(true)}>
            <Text style={s.link}>+ log a past read</Text>
          </Pressable>
        )}
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
  cardPad: { padding: 14 },
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
  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.fgFaint,
    marginBottom: 4,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 6,
    fontSize: 14,
    color: C.fg,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.paper,
  },
  chipActive: { backgroundColor: C.plum, borderColor: C.plum },
  chipText: { fontSize: 12, color: C.fgMuted },
  chipTextActive: { color: C.white },
  miniLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.fgFaint,
    marginBottom: 6,
  },
  hint: { fontSize: 12, color: C.fgFaint, marginTop: 8 },
  readRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  readRange: { fontSize: 12, color: C.fgMid },
  readStatus: { fontSize: 12, color: C.fgFaint },
  current: { fontSize: 12, color: C.terraInk },
  pastRead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  feeling: {
    fontSize: 12,
    fontStyle: "italic",
    color: C.fgFaint,
    marginTop: 2,
  },
  remove: { fontSize: 18, color: C.fgFaint, paddingHorizontal: 4 },
  link: { fontSize: 13, color: C.fgMuted },
  logForm: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 12,
  },
  saveBtn: {
    backgroundColor: C.plum,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: { color: C.white, fontSize: 13, fontWeight: "600" },
  danger: { fontSize: 13, color: C.danger, marginTop: 10 },
});
