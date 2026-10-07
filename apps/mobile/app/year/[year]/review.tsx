import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  MONTH_NAMES,
  countBy,
  countTags,
  fmtHours,
  fmtPages,
  formatShortDate,
  monthKey,
  uniqueById,
  type BookEntry,
} from "@spine/shared";
import { C, RGB, SERIF, alpha } from "@/components/login/tokens";
import {
  BarList,
  Card,
  MonthlyChart,
  RatingRow,
  ReviewBookRow,
  ReviewSection,
  StatTile,
  reviewStyles as rs,
} from "@/components/year/review";
import { useYearData } from "@/lib/useYearData";

const isAudio = (b: BookEntry) => b.format === "audiobook";

export default function YearReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year: string }>();
  const year = Number(params.year) || new Date().getFullYear();
  const { loading, error, allEntries, finishedBooks, loggedDates, lists } =
    useYearData(year);

  const r = useMemo(() => {
    const libraryBookIds = new Set<string>();
    const acquisition = new Map<string, string>();
    for (const list of lists) {
      for (const item of list.items) {
        if (!item.bookId) continue;
        if (list.listType === "library_loan") libraryBookIds.add(item.bookId);
        if (
          list.listType === "book_ledger" &&
          item.type === "bought" &&
          item.notes
        )
          acquisition.set(item.bookId, item.notes);
      }
    }

    const printBooks = finishedBooks.filter((b) => !isAudio(b));
    const audioBooks = finishedBooks.filter(isAudio);
    const totalPages = printBooks.reduce((s, b) => s + (b.pageCount ?? 0), 0);
    const totalAudioMinutes = audioBooks.reduce(
      (s, b) => s + (b.audioDurationMinutes ?? 0),
      0,
    );
    const rereads = finishedBooks.filter((b) => b.reads.length > 0);
    const libraryFinished = finishedBooks.filter((b) =>
      libraryBookIds.has(b.id),
    );
    const dnfs = allEntries.filter(
      (b) =>
        b.status === "did-not-finish" && b.dateDnfed?.startsWith(`${year}`),
    );

    const ratingDist: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const b of finishedBooks) {
      if (b.rating >= 1 && b.rating <= 5) {
        const k = Math.round(b.rating);
        ratingDist[k] = (ratingDist[k] ?? 0) + 1;
      }
    }
    const rated = finishedBooks.filter((b) => b.rating > 0);
    const avgRating = rated.length
      ? rated.reduce((s, b) => s + b.rating, 0) / rated.length
      : 0;

    const monthly: Record<string, number> = {};
    for (const b of finishedBooks) {
      if (b.dateFinished) {
        const m = b.dateFinished.slice(0, 7);
        monthly[m] = (monthly[m] ?? 0) + 1;
      }
    }
    const months = MONTH_NAMES.map((name, i) => {
      const key = monthKey(year, i);
      return { key, label: name.slice(0, 3), count: monthly[key] ?? 0 };
    });

    const withPages = uniqueById(
      printBooks.filter((b) => (b.pageCount ?? 0) > 0),
    ).sort((a, b) => (a.pageCount ?? 0) - (b.pageCount ?? 0));
    const withAudio = uniqueById(
      audioBooks.filter((b) => (b.audioDurationMinutes ?? 0) > 0),
    ).sort(
      (a, b) => (a.audioDurationMinutes ?? 0) - (b.audioDurationMinutes ?? 0),
    );

    return {
      totalPages,
      totalAudioMinutes,
      rereads,
      uniqueRereads: uniqueById(rereads),
      libraryFinished,
      dnfs,
      ratingDist,
      maxRatingCount: Math.max(...Object.values(ratingDist), 1),
      avgRating,
      months,
      printMissingPages: uniqueById(printBooks.filter((b) => !b.pageCount)),
      audioMissingHours: uniqueById(
        audioBooks.filter((b) => !b.audioDurationMinutes),
      ),
      genreCounts: countTags(finishedBooks, (b) => b.genres),
      formatCounts: countBy(
        finishedBooks.filter((b) => b.format),
        (b) => b.format,
      ),
      publisherCounts: countBy(
        uniqueById(finishedBooks).filter((b) => b.publisher),
        (b) => b.publisher,
      ).slice(0, 10),
      acquiredCounts: countBy(
        finishedBooks.flatMap((b) => {
          const src = acquisition.get(b.id);
          return src ? [src] : [];
        }),
        (x) => x,
      ),
      diversityCounts: countTags(
        uniqueById(finishedBooks),
        (b) => b.diversityTags,
      ),
      shortestPrint: withPages[0] ?? null,
      longestPrint: withPages[withPages.length - 1] ?? null,
      shortestAudio: withAudio[0] ?? null,
      longestAudio: withAudio[withAudio.length - 1] ?? null,
    };
  }, [allEntries, finishedBooks, lists, year]);

  const hasData = finishedBooks.length > 0;
  const summary = [
    `${finishedBooks.length} ${finishedBooks.length === 1 ? "book" : "books"} finished`,
    r.totalPages > 0 ? `${fmtPages(r.totalPages)} pages` : null,
    r.totalAudioMinutes > 0
      ? `${fmtHours(r.totalAudioMinutes)} listened`
      : null,
    loggedDates.size > 0 ? `${loggedDates.size} days read` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.cream }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Pressable
            hitSlop={8}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
          >
            <Text style={s.back}>← {year}</Text>
          </Pressable>
          <Text style={s.eyebrow}>year in review</Text>
          <Text style={s.year}>{year}</Text>
          {hasData && !loading ? (
            <Text style={s.summary}>{summary}</Text>
          ) : null}
        </View>

        <View style={s.body}>
          {loading ? (
            <ActivityIndicator color={C.fgMuted} style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={s.error}>couldn&apos;t load. {error}</Text>
          ) : !hasData ? (
            <Text style={s.empty}>no finished books for {year} yet.</Text>
          ) : (
            <>
              <View style={s.tiles}>
                <StatTile
                  label="books finished"
                  value={finishedBooks.length}
                  accent={C.terra}
                />
                <StatTile
                  label="pages read"
                  value={r.totalPages > 0 ? fmtPages(r.totalPages) : "—"}
                  accent={C.sage}
                />
                <StatTile
                  label="hours listened"
                  value={
                    r.totalAudioMinutes > 0
                      ? fmtHours(r.totalAudioMinutes)
                      : "—"
                  }
                  accent={C.gold}
                />
                <StatTile
                  label="days read"
                  value={loggedDates.size}
                  accent={C.lavender}
                />
                <StatTile
                  label="re-reads"
                  value={r.rereads.length}
                  accent={C.terra}
                />
                <StatTile
                  label="library checkouts"
                  value={r.libraryFinished.length}
                  accent={C.sage}
                />
                <StatTile
                  label="did not finish"
                  value={r.dnfs.length}
                  accent={C.gold}
                />
                <StatTile
                  label="avg rating"
                  value={r.avgRating > 0 ? `${r.avgRating.toFixed(1)}★` : "—"}
                  accent={C.lavender}
                />
              </View>

              {r.printMissingPages.length > 0 ||
              r.audioMissingHours.length > 0 ? (
                <View style={{ marginBottom: 36 }}>
                  <Card>
                    <Text style={s.cardTitle}>
                      add missing details to make these counts accurate.
                    </Text>
                    <Text style={rs.small}>
                      tap a book to fill in the length.
                    </Text>
                    {r.printMissingPages.length > 0 ? (
                      <View style={{ marginTop: 10 }}>
                        <Text style={rs.cardLabel}>
                          missing page count · {r.printMissingPages.length}
                        </Text>
                        {r.printMissingPages.map((b) => (
                          <ReviewBookRow key={b.id} book={b} meta="add pages" />
                        ))}
                      </View>
                    ) : null}
                    {r.audioMissingHours.length > 0 ? (
                      <View style={{ marginTop: 10 }}>
                        <Text style={rs.cardLabel}>
                          missing audio length · {r.audioMissingHours.length}
                        </Text>
                        {r.audioMissingHours.map((b) => (
                          <ReviewBookRow key={b.id} book={b} meta="add hours" />
                        ))}
                      </View>
                    ) : null}
                  </Card>
                </View>
              ) : null}

              <ReviewSection label="books per month">
                <MonthlyChart months={r.months} />
              </ReviewSection>

              <ReviewSection label="star ratings & dnf">
                <View style={{ gap: 8 }}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <RatingRow
                      key={n}
                      label={`${n}★`}
                      count={r.ratingDist[n] ?? 0}
                      max={r.maxRatingCount}
                    />
                  ))}
                  {r.dnfs.length > 0 ? (
                    <View style={s.dnfDivider}>
                      <RatingRow
                        label="dnf"
                        count={r.dnfs.length}
                        max={Math.max(r.maxRatingCount, r.dnfs.length)}
                        color={alpha(RGB.terra, 0.5)}
                      />
                    </View>
                  ) : null}
                </View>
              </ReviewSection>

              {r.formatCounts.length > 0 ? (
                <ReviewSection label="by format / edition">
                  <BarList items={r.formatCounts} />
                </ReviewSection>
              ) : null}
              {r.genreCounts.length > 0 ? (
                <ReviewSection label="genres & sub-genres">
                  <BarList items={r.genreCounts} />
                </ReviewSection>
              ) : null}
              {r.diversityCounts.length > 0 ? (
                <ReviewSection label="by diversity">
                  <BarList items={r.diversityCounts} color={C.plum} />
                </ReviewSection>
              ) : null}
              {r.publisherCounts.length > 0 ? (
                <ReviewSection label="by publisher">
                  <BarList items={r.publisherCounts} color={C.sage} />
                </ReviewSection>
              ) : null}
              {r.acquiredCounts.length > 0 ? (
                <ReviewSection label="where books came from">
                  <BarList items={r.acquiredCounts} color={C.terra} />
                </ReviewSection>
              ) : null}

              {r.shortestPrint || r.shortestAudio ? (
                <ReviewSection label="shortest & longest reads">
                  <View style={{ gap: 12 }}>
                    {r.shortestPrint ? (
                      <Card>
                        <Text style={rs.cardLabel}>print</Text>
                        <ExtremeRow
                          label="shortest"
                          book={r.shortestPrint}
                          meta={`${fmtPages(r.shortestPrint.pageCount!)} pp`}
                        />
                        {r.longestPrint &&
                        r.longestPrint.id !== r.shortestPrint.id ? (
                          <ExtremeRow
                            label="longest"
                            book={r.longestPrint}
                            meta={`${fmtPages(r.longestPrint.pageCount!)} pp`}
                          />
                        ) : null}
                      </Card>
                    ) : null}
                    {r.shortestAudio ? (
                      <Card>
                        <Text style={rs.cardLabel}>audio</Text>
                        <ExtremeRow
                          label="shortest"
                          book={r.shortestAudio}
                          meta={fmtHours(r.shortestAudio.audioDurationMinutes!)}
                        />
                        {r.longestAudio &&
                        r.longestAudio.id !== r.shortestAudio.id ? (
                          <ExtremeRow
                            label="longest"
                            book={r.longestAudio}
                            meta={fmtHours(
                              r.longestAudio.audioDurationMinutes!,
                            )}
                          />
                        ) : null}
                      </Card>
                    ) : null}
                  </View>
                </ReviewSection>
              ) : null}

              {r.uniqueRereads.length > 0 ? (
                <ReviewSection label={`re-reads · ${r.rereads.length}`}>
                  {r.uniqueRereads.map((b) => (
                    <ReviewBookRow
                      key={b.id}
                      book={b}
                      meta={
                        b.dateFinished
                          ? formatShortDate(b.dateFinished)
                          : undefined
                      }
                    />
                  ))}
                </ReviewSection>
              ) : null}

              {r.libraryFinished.length > 0 ? (
                <ReviewSection
                  label={`library checkouts · ${r.libraryFinished.length}`}
                >
                  {uniqueById(r.libraryFinished).map((b) => (
                    <ReviewBookRow
                      key={b.id}
                      book={b}
                      meta={b.format || undefined}
                    />
                  ))}
                </ReviewSection>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExtremeRow({
  label,
  book,
  meta,
}: {
  label: string;
  book: BookEntry;
  meta: string;
}) {
  return (
    <View>
      <Text style={s.extremeLabel}>{label}</Text>
      <ReviewBookRow book={book} meta={meta} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.plumDark },
  hero: {
    backgroundColor: C.plumDark,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  back: { fontSize: 12, color: alpha(RGB.cream, 0.5), marginBottom: 24 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: alpha(RGB.cream, 0.6),
    marginBottom: 4,
  },
  year: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontWeight: "700",
    fontSize: 48,
    color: C.white,
    letterSpacing: -1.5,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
    color: alpha(RGB.cream, 0.7),
    marginTop: 10,
  },
  body: { paddingHorizontal: 24, paddingTop: 24, backgroundColor: C.cream },
  error: { color: C.danger, paddingVertical: 16 },
  empty: {
    fontSize: 14,
    color: C.fgFaint,
    textAlign: "center",
    paddingVertical: 60,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 36,
  },
  cardTitle: { fontSize: 14, color: C.fg },
  dnfDivider: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  extremeLabel: { fontSize: 10, color: C.fgFaint, marginTop: 4 },
});
