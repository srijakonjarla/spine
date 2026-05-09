import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { currentStreak, localDateStr, streakRuns } from "@spine/shared";
import { addQuote } from "@/lib/library";
import {
  ConfirmSheet,
  CurrentlyReading,
  Greeting,
  LogProgressModal,
  QuickActions,
  RecentEntries,
  SaveQuoteModal,
  StatCardsRow,
  TopBar,
  homeStyles as s,
  type Entry,
  type ReadingBook,
} from "@/components/home";
import { useAuth } from "@/lib/auth";
import { useBooks } from "@/lib/booksContext";
import {
  createYearGoal,
  loadHomeData,
  logProgress,
  markBookFinished,
  type HomeData,
} from "@/lib/home";
import { C } from "@/components/login/tokens";

const CURRENT_YEAR = new Date().getFullYear();

const MONTH_ABBRS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function formatEntryDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `READING · ${MONTH_ABBRS[m - 1]} ${d}`;
}

function firstNameFromUser(
  user:
    | {
        email?: string;
        user_metadata?: { name?: string; full_name?: string };
      }
    | null
    | undefined,
): string {
  if (!user) return "reader";
  const meta = user.user_metadata;
  const full = meta?.name ?? meta?.full_name;
  if (full) return full.split(" ")[0];
  if (user.email) return user.email.split("@")[0];
  return "reader";
}

function readingToBook(r: HomeData["reading"][number]): ReadingBook {
  return {
    title: r.title || "untitled",
    author: r.author,
    coverUrl: r.coverUrl || undefined,
    pageCount: r.pageCount,
    dateStarted: r.dateStarted,
  };
}

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;
  const name = firstNameFromUser(session?.user);
  const { books: allBooks } = useBooks();

  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await loadHomeData(CURRENT_YEAR);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    loadHomeData(CURRENT_YEAR)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Derived values
  const loggedDates = useMemo(
    () => new Set((data?.log ?? []).map((e) => e.logDate)),
    [data?.log],
  );
  const streak = useMemo(() => currentStreak(loggedDates), [loggedDates]);
  const streakHistory = useMemo(() => {
    const runs = streakRuns(loggedDates, CURRENT_YEAR);
    return runs.length ? runs.slice(-14).map((r) => r.length) : [0];
  }, [loggedDates]);

  const currentBookData = data?.reading[0];
  const currentBook = useMemo(
    () => (currentBookData ? readingToBook(currentBookData) : null),
    [currentBookData],
  );

  const recentEntries = useMemo<Entry[]>(() => {
    const todayStr = localDateStr(new Date());
    // Resolve which book was being read on a given log date by checking
    // each book's started/finished window. `reading_log` has no book_id,
    // so this is a best-effort heuristic.
    const bookForDate = (logDate: string): string | undefined => {
      for (const b of allBooks) {
        if (!b.dateStarted) continue;
        if (logDate < b.dateStarted) continue;
        if (b.dateFinished && logDate > b.dateFinished) continue;
        // For "reading" books with no dateFinished, the window is open-ended
        return b.title;
      }
      return undefined;
    };
    return (data?.log ?? [])
      .filter((e) => e.note.trim().length > 0)
      .slice(-3)
      .reverse()
      .map((e) => ({
        id: e.id,
        date: formatEntryDate(e.logDate),
        title: bookForDate(e.logDate),
        note: e.note,
        footer:
          e.pagesRead && e.pagesRead > 0
            ? `${e.pagesRead} pages${e.logDate === todayStr ? " · today" : ""}`
            : e.logDate === todayStr
              ? "today"
              : "",
      }));
  }, [data?.log, allBooks]);

  // ─── Action handlers ────────────────────────────────────────────
  const handleMarkDone = useCallback(() => {
    if (!currentBookData) return;
    setDoneOpen(true);
  }, [currentBookData]);

  const confirmMarkDone = useCallback(async () => {
    if (!currentBookData) return;
    try {
      setBusyAction(true);
      const id = currentBookData.id;
      await markBookFinished(id);
      await refresh();
      setDoneOpen(false);
      router.push(`/book/${id}`);
    } catch (e) {
      Alert.alert(
        "couldn't mark done",
        e instanceof Error ? e.message : "try again later.",
      );
    } finally {
      setBusyAction(false);
    }
  }, [currentBookData, refresh, router]);

  const handleLogProgress = useCallback(() => setLogOpen(true), []);
  const handleSaveQuote = useCallback(() => setQuoteOpen(true), []);

  const submitLog = useCallback(
    async ({ pages, note }: { pages: number; note: string }) => {
      if (!userId) return;
      try {
        setBusyAction(true);
        await logProgress({
          userId,
          pagesRead: pages,
          note: note.trim() || undefined,
        });
        await refresh();
        setLogOpen(false);
      } catch (e) {
        Alert.alert(
          "couldn't log",
          e instanceof Error ? e.message : "try again later.",
        );
      } finally {
        setBusyAction(false);
      }
    },
    [userId, refresh],
  );

  const submitQuote = useCallback(
    async ({ text, page }: { text: string; page: string }) => {
      if (!currentBookData) return;
      try {
        setBusyAction(true);
        await addQuote(text.trim(), currentBookData.id, page.trim());
        setQuoteOpen(false);
      } catch (e) {
        Alert.alert(
          "couldn't save quote",
          e instanceof Error ? e.message : "try again later.",
        );
      } finally {
        setBusyAction(false);
      }
    },
    [currentBookData],
  );

  const handleSetGoal = useCallback(() => {
    if (!userId) return;
    Alert.prompt(
      "set a year goal",
      "how many books do you want to read this year?",
      [
        { text: "cancel", style: "cancel" },
        {
          text: "set",
          onPress: async (input?: string) => {
            const n = Number(input);
            if (!Number.isFinite(n) || n <= 0) {
              Alert.alert("hmm", "enter a number greater than zero.");
              return;
            }
            try {
              setBusyAction(true);
              await createYearGoal({
                userId,
                year: CURRENT_YEAR,
                target: Math.round(n),
              });
              await refresh();
            } catch (e) {
              Alert.alert(
                "couldn't set goal",
                e instanceof Error ? e.message : "try again later.",
              );
            } finally {
              setBusyAction(false);
            }
          },
        },
      ],
      "plain-text",
      "12",
      "number-pad",
    );
  }, [userId, refresh]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <TopBar />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Greeting
          name={name}
          streakDays={streak}
          pagesToday={data?.pagesToday ?? 0}
        />

        {loading && (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={C.fgMuted} />
          </View>
        )}

        {!loading && error && (
          <Text style={{ color: "#b03a2e", paddingVertical: 16 }}>
            couldn&apos;t load your journal. {error}
          </Text>
        )}

        {!loading && !error && data && (
          <>
            {currentBook ? (
              <>
                <Text style={s.sectionLabel}>currently reading</Text>
                <CurrentlyReading
                  book={currentBook}
                  onPress={() =>
                    currentBookData &&
                    router.push(`/book/${currentBookData.id}`)
                  }
                />
              </>
            ) : (
              <View
                style={{
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                  marginBottom: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(45,27,46,0.08)",
                  backgroundColor: C.paper,
                }}
              >
                <Text style={s.sectionHand}>
                  nothing on the nightstand yet — pick up a book to start
                  logging.
                </Text>
              </View>
            )}

            {currentBookData ? (
              <QuickActions
                disabled={busyAction}
                onLogProgress={handleLogProgress}
                onSaveQuote={handleSaveQuote}
                onMarkDone={handleMarkDone}
              />
            ) : null}

            <StatCardsRow
              streakDays={streak}
              streakHistory={streakHistory}
              streakCaveat={
                streak >= 2
                  ? `${streak} days in a row`
                  : streak === 1
                    ? "started today"
                    : "no streak yet"
              }
              goalCurrent={data.goal?.current ?? 0}
              goalTarget={data.goal?.target ?? 0}
              hasGoal={!!data.goal}
              onSetGoal={handleSetGoal}
              onOpenGoal={() => router.push("/goals")}
              goalCaveat={
                data.goal && data.goal.current >= data.goal.target
                  ? "goal reached"
                  : data.goal &&
                      data.goal.target > 0 &&
                      data.goal.current / data.goal.target >= 0.75
                    ? "almost there"
                    : data.goal &&
                        data.goal.target > 0 &&
                        data.goal.current / data.goal.target >= 0.5
                      ? "halfway there"
                      : "keep reading"
              }
              year={CURRENT_YEAR}
            />

            <RecentEntries
              entries={recentEntries}
              onSelect={() =>
                currentBookData && router.push(`/book/${currentBookData.id}`)
              }
            />
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <LogProgressModal
        open={logOpen}
        bookTitle={currentBookData?.title}
        busy={busyAction}
        onClose={() => setLogOpen(false)}
        onSubmit={submitLog}
      />
      <SaveQuoteModal
        open={quoteOpen}
        bookTitle={currentBookData?.title}
        busy={busyAction}
        onClose={() => setQuoteOpen(false)}
        onSubmit={submitQuote}
      />
      <ConfirmSheet
        open={doneOpen}
        title="mark as finished?"
        message={
          currentBookData
            ? `${currentBookData.title} will move to your finished shelf as of today.`
            : ""
        }
        confirmLabel="finish"
        busy={busyAction}
        onConfirm={confirmMarkDone}
        onClose={() => setDoneOpen(false)}
      />
    </SafeAreaView>
  );
}
