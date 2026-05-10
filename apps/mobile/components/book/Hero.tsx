import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import {
  heroGradientFor,
  parseLocalDate,
  type BookEntry,
  type ReadingStatus,
} from "@spine/shared";
import { BookmarkIcon, CalendarIcon, StarIcon } from "@/components/icons";
import { BookCoverThumb } from "@/components/library/BookCoverThumb";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

const STATUSES: { id: ReadingStatus; label: string }[] = [
  { id: "reading", label: "reading" },
  { id: "finished", label: "read" },
  { id: "did-not-finish", label: "did not finish" },
  { id: "want-to-read", label: "want to read" },
];

function shortNumeric(iso: string): string {
  const d = parseLocalDate(iso);
  if (!d) return "";
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function Hero({
  entry,
  onBack,
  onPatch,
}: {
  entry: BookEntry;
  onBack: () => void;
  onPatch: (p: Partial<BookEntry>) => void;
}) {
  const gradient = heroGradientFor(entry.title);
  return (
    <View style={[s.hero, { backgroundColor: gradient[1] }]}>
      <Svg
        style={StyleSheet.absoluteFill}
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
        <View style={s.heroCoverWrap}>
          <BookCoverThumb
            coverUrl={entry.coverUrl}
            title={entry.title || "untitled"}
            author={entry.author}
            width={68}
            height={102}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.heroTitle} numberOfLines={3}>
            {entry.title || "untitled"}
          </Text>
          {entry.author ? (
            <Text style={s.heroAuthor}>by {entry.author}</Text>
          ) : null}
          <View style={s.heroMeta}>
            <RatingStars rating={entry.rating ?? 0} />
            {(entry.pageCount ?? 0) > 0 ? (
              <Text style={s.heroMetaText}>· {entry.pageCount} pages</Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={s.statusRow}>
        {STATUSES.map((opt) => {
          const active = entry.status === opt.id;
          return (
            <Pressable
              key={opt.id}
              hitSlop={6}
              onPress={() => onPatch({ status: opt.id })}
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

      {entry.genres && entry.genres.length > 0 ? (
        <View style={s.genreRow}>
          {entry.genres.slice(0, 6).map((g) => (
            <View key={g} style={s.genreChip}>
              <Text style={s.genreChipText}>{g}</Text>
            </View>
          ))}
          <View style={[s.genreChip, s.genreChipAdd]}>
            <Text style={s.genreChipText}>+ genre</Text>
          </View>
        </View>
      ) : null}

      <View style={s.dateRow}>
        {entry.dateStarted ? (
          <DateBlock label="STARTED" value={entry.dateStarted} />
        ) : null}
        {entry.dateFinished ? (
          <DateBlock label="FINISHED" value={entry.dateFinished} />
        ) : entry.dateDnfed ? (
          <DateBlock label="DNF'D" value={entry.dateDnfed} />
        ) : entry.dateShelved ? (
          <DateBlock label="SHELVED" value={entry.dateShelved} />
        ) : null}
      </View>
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
          color="#d4a843"
          weight={i <= value ? "bold" : "regular"}
        />
      ))}
    </View>
  );
}

function DateBlock({ label, value }: { label: string; value?: string }) {
  return (
    <View style={s.dateBlock}>
      <Text style={s.dateLabel}>{label}</Text>
      <View style={s.dateValueRow}>
        <CalendarIcon size={12} color={C.cream} />
        <Text style={s.dateValue}>{value ? shortNumeric(value) : "—"}</Text>
      </View>
    </View>
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
    backgroundColor: "rgba(250,246,240,0.06)",
    borderWidth: 1,
    borderColor: "rgba(250,246,240,0.12)",
  },
  statusPillActive: { backgroundColor: "#7b9e87", borderColor: "#7b9e87" },
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
    borderColor: "rgba(250,246,240,0.18)",
  },
  genreChipAdd: { borderStyle: "dashed" },
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
