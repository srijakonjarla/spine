import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import {
  formatDate,
  heroGradientFor,
  localDateStr,
  type BookEntry,
  type BookRead,
  type ReadingStatus,
} from "@spine/shared";
import { BookmarkIcon, CalendarIcon, StarIcon } from "@/components/icons";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { C, RGB, alpha } from "@/components/login/tokens";
import { DatePickerSheet } from "@/components/ui/DatePickerSheet";
import type { ReadPatch } from "@/lib/library";
import { CoverPickerSheet } from "./CoverPickerSheet";

type DateField = "dateStarted" | "dateFinished" | "dateDnfed" | "dateShelved";

const DATE_LABEL: Record<DateField, string> = {
  dateStarted: "STARTED",
  dateFinished: "FINISHED",
  dateDnfed: "DNF'D",
  dateShelved: "SHELVED",
};

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

const STATUSES: { id: ReadingStatus; label: string }[] = [
  { id: "reading", label: "reading" },
  { id: "finished", label: "read" },
  { id: "did-not-finish", label: "did not finish" },
  { id: "want-to-read", label: "want to read" },
];

export function Hero({
  entry,
  onBack,
  onPatch,
  onStatusChange,
  onReread,
  rereadLoading,
  viewedRead,
  onUpdateRead,
}: {
  entry: BookEntry;
  onBack: () => void;
  onPatch: (p: Partial<BookEntry>) => void;
  onStatusChange: (status: ReadingStatus) => void;
  onReread: () => void;
  rereadLoading: boolean;
  /** A past read picked in the read selector; the date row then edits it. */
  viewedRead: BookRead | null;
  onUpdateRead: (readId: string, patch: Partial<ReadPatch>) => Promise<void>;
}) {
  const gradient = heroGradientFor(entry.title);
  const [editing, setEditing] = useState<DateField | null>(null);
  const [pickingCover, setPickingCover] = useState(false);
  // Same as web: a past read shows (and edits) its own started/finished.
  const dates: Pick<BookEntry, DateField> & { status: ReadingStatus } =
    viewedRead ?? entry;
  const dateFields: DateField[] = viewedRead
    ? ["dateStarted", "dateFinished"]
    : visibleDateFields(entry);
  const pickDate = (field: DateField, d: string) => {
    if (!viewedRead) {
      onPatch({ [field]: d });
      return;
    }
    if (field !== "dateStarted" && field !== "dateFinished") return;
    onUpdateRead(viewedRead.id, { [field]: d }).catch(() =>
      Alert.alert("couldn't save date", "try again later."),
    );
  };
  const canReread =
    entry.reads.length > 0 ||
    entry.status === "finished" ||
    entry.status === "did-not-finish";
  return (
    <View style={[s.hero, { backgroundColor: gradient[1] }]}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <Defs>
          <SvgLinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="0.6" stopColor={gradient[1]} />
            <Stop offset="1" stopColor={gradient[2]} />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#heroGrad)" />
      </Svg>
      <View style={s.heroBar}>
        <Pressable hitSlop={8} onPress={onBack}>
          <Text style={s.heroBarText}>←</Text>
        </Pressable>
        <Pressable
          hitSlop={8}
          onPress={() => onPatch({ bookmarked: !entry.bookmarked })}
        >
          <BookmarkIcon
            size={18}
            color={C.cream}
            weight={entry.bookmarked ? "bold" : "regular"}
          />
        </Pressable>
      </View>

      <View style={s.heroTop}>
        <Pressable
          onPress={() => setPickingCover(true)}
          accessibilityLabel="change cover"
          style={({ pressed }) => [
            s.heroCoverWrap,
            pressed && { opacity: 0.8 },
          ]}
        >
          <BookCoverThumb
            coverUrl={entry.coverUrl}
            title={entry.title || "untitled"}
            author={entry.author}
            width={68}
            height={102}
          />
          <View style={s.coverHint}>
            <Text style={s.coverHintText}>change</Text>
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.heroTitle} numberOfLines={3}>
            {entry.title || "untitled"}
          </Text>
          {entry.author ? (
            <Text style={s.heroAuthor}>by {entry.author}</Text>
          ) : null}
          <View style={s.heroMeta}>
            <RatingStars rating={(viewedRead ?? entry).rating ?? 0} />
            {(entry.pageCount ?? 0) > 0 ? (
              <Text style={s.heroMetaText}>· {entry.pageCount} pages</Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={s.statusRow}>
        {STATUSES.map((opt) => {
          const active = entry.status === opt.id;
          // Once a book has been read, "reading" means starting a re-read.
          if (opt.id === "reading" && canReread && entry.status !== "reading") {
            return (
              <Pressable
                key={opt.id}
                hitSlop={6}
                disabled={rereadLoading}
                onPress={onReread}
                style={[s.statusPill, rereadLoading && { opacity: 0.5 }]}
              >
                <Text style={s.statusPillText}>
                  {rereadLoading ? "starting…" : "↺ re-read"}
                </Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={opt.id}
              hitSlop={6}
              onPress={() => onStatusChange(opt.id)}
              style={[s.statusPill, active && s.statusPillActive]}
            >
              <Text
                style={[s.statusPillText, active && s.statusPillTextActive]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <GenreRow entry={entry} onPatch={onPatch} />

      <View style={s.dateRow}>
        {dateFields.map((f) => (
          <DateBlock
            key={f}
            label={DATE_LABEL[f]}
            value={dates[f]}
            onPress={() => setEditing(f)}
          />
        ))}
      </View>

      <DatePickerSheet
        open={editing !== null}
        title={editing ? `${DATE_LABEL[editing].toLowerCase()} on` : ""}
        value={editing ? dates[editing] : ""}
        min={editing ? dateBounds(dates, editing).min : undefined}
        max={editing ? dateBounds(dates, editing).max : undefined}
        onClose={() => setEditing(null)}
        onPick={(d) => editing && pickDate(editing, d)}
      />

      <CoverPickerSheet
        open={pickingCover}
        entry={entry}
        onClose={() => setPickingCover(false)}
        onSelect={(coverUrl) => {
          setPickingCover(false);
          onPatch({ coverUrl });
        }}
      />
    </View>
  );
}

/** Which dates the hero shows for each status (matches web). */
function visibleDateFields(entry: BookEntry): DateField[] {
  switch (entry.status) {
    case "want-to-read":
      return ["dateShelved"];
    case "finished":
      return ["dateStarted", "dateFinished"];
    case "did-not-finish":
      return ["dateStarted", "dateDnfed"];
    default:
      return ["dateStarted"];
  }
}

/** Same bounds as web's date inputs: no future dates, start ≤ end. */
function dateBounds(
  entry: Pick<BookEntry, DateField | "status">,
  field: DateField,
): { min?: string; max: string } {
  const today = localDateStr();
  if (field === "dateStarted") {
    const end =
      entry.status === "finished"
        ? entry.dateFinished
        : entry.status === "did-not-finish"
          ? entry.dateDnfed
          : "";
    return { max: end && end < today ? end : today };
  }
  if (field === "dateFinished" || field === "dateDnfed")
    return { min: entry.dateStarted || undefined, max: today };
  return { max: today };
}

/**
 * Catalog genres are read-only; genres you add live in userGenres and can
 * be removed by tapping them (same as web's hero).
 */
function GenreRow({
  entry,
  onPatch,
}: {
  entry: BookEntry;
  onPatch: (p: Partial<BookEntry>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const userGenres = entry.userGenres ?? [];
  const all = [
    ...(entry.genres ?? []),
    ...userGenres.filter((g) => !(entry.genres ?? []).includes(g)),
  ];

  const add = () => {
    const g = draft.trim();
    setDraft("");
    setAdding(false);
    if (!g || all.some((x) => x.toLowerCase() === g.toLowerCase())) return;
    onPatch({
      userGenres: [...userGenres, g],
      genres: [...(entry.genres ?? []), g],
    });
  };
  const remove = (g: string) =>
    onPatch({
      userGenres: userGenres.filter((x) => x !== g),
      genres: (entry.genres ?? []).filter((x) => x !== g),
    });

  return (
    <View style={s.genreRow}>
      {all.map((g) =>
        userGenres.includes(g) ? (
          <Pressable
            key={g}
            hitSlop={4}
            onPress={() => remove(g)}
            accessibilityLabel={`remove ${g}`}
            style={[s.genreChip, s.genreChipUser]}
          >
            <Text style={[s.genreChipText, { opacity: 0.9 }]}>{g} ×</Text>
          </Pressable>
        ) : (
          <View key={g} style={s.genreChip}>
            <Text style={s.genreChipText}>{g}</Text>
          </View>
        ),
      )}
      {adding ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          // Return blurs a single-line input, so committing on blur alone
          // covers both Return and tapping away without a double add.
          onBlur={add}
          autoFocus
          placeholder="genre…"
          placeholderTextColor={alpha(RGB.cream, 0.4)}
          returnKeyType="done"
          style={[s.genreChip, s.genreInput]}
        />
      ) : (
        <Pressable
          hitSlop={4}
          onPress={() => setAdding(true)}
          style={[s.genreChip, s.genreChipAdd]}
        >
          <Text style={s.genreChipText}>+ genre</Text>
        </Pressable>
      )}
    </View>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <View style={s.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          size={14}
          color={C.gold}
          weight={i <= value ? "bold" : "regular"}
        />
      ))}
    </View>
  );
}

function DateBlock({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      accessibilityLabel={`edit ${label.toLowerCase()} date`}
      style={({ pressed }) => [s.dateBlock, pressed && { opacity: 0.6 }]}
    >
      <Text style={s.dateLabel}>{label}</Text>
      <View style={s.dateValueRow}>
        <CalendarIcon size={12} color={C.cream} />
        <Text style={s.dateValue}>
          {value ? formatDate(value) : "add date"}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },
  heroBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  heroBarText: { fontSize: 13, color: C.cream, opacity: 0.7 },
  heroTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heroCoverWrap: { borderRadius: 4, overflow: "hidden" },
  coverHint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
  },
  coverHintText: { fontSize: 9, color: C.cream, letterSpacing: 0.6 },
  heroTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    fontStyle: "italic",
    fontWeight: "600",
    color: C.cream,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroAuthor: { fontSize: 13, color: C.cream, opacity: 0.65, marginTop: 4 },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  heroMetaText: { fontSize: 12, color: C.cream, opacity: 0.55 },
  stars: { flexDirection: "row", gap: 1 },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: alpha(RGB.cream, 0.06),
    borderWidth: 1,
    borderColor: alpha(RGB.cream, 0.12),
  },
  statusPillActive: { backgroundColor: C.sage, borderColor: C.sage },
  statusPillText: { fontSize: 11, color: C.cream, opacity: 0.7 },
  statusPillTextActive: { color: C.cream, opacity: 1, fontWeight: "600" },

  genreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: alpha(RGB.cream, 0.18),
  },
  genreChipAdd: { borderStyle: "dashed" },
  genreChipUser: { borderColor: alpha(RGB.cream, 0.45) },
  genreInput: {
    minWidth: 90,
    fontSize: 11,
    color: C.cream,
    paddingVertical: 3,
  },
  genreChipText: { fontSize: 11, color: C.cream, opacity: 0.65 },

  dateRow: { flexDirection: "row", gap: 24 },
  dateBlock: { gap: 4 },
  dateLabel: {
    fontSize: 9,
    color: C.cream,
    opacity: 0.45,
    letterSpacing: 1.4,
  },
  dateValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateValue: { fontSize: 12, color: C.cream, opacity: 0.85 },
});
