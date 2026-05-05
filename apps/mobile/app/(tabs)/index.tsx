import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { currentStreak, localDateStr, streakRuns } from "@spine/shared";
import {
  CurrentlyReading,
  Greeting,
  QuickActions,
  RecentEntries,
  StatCardsRow,
  TopBar,
  homeStyles as s,
  type Entry,
  type ReadingBook,
} from "@/components/home";
import { useAuth } from "@/lib/auth";
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

  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

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
  const loggedDates = new Set((data?.log ?? []).map((e) => e.logDate));
  const streak = currentStreak(loggedDates);
  const runs = streakRuns(loggedDates, CURRENT_YEAR);
  const streakHistory = runs.length
    ? runs.slice(-14).map((r) => r.length)
    : [0];

  const currentBookData = data?.reading[0];
  const currentBook = currentBookData ? readingToBook(currentBookData) : null;

  const todayStr = localDateStr(new Date());
  const recentEntries: Entry[] = (data?.log ?? [])
    .filter((e) => e.note.trim().length > 0)
    .slice(-3)
    .reverse()
    .map((e) => ({
      id: e.id,
      date: formatEntryDate(e.logDate),
      title: data?.reading[0]?.title ?? "today",
      note: e.note,
      footer:
        e.pagesRead && e.pagesRead > 0
          ? `${e.pagesRead} pages${e.logDate === todayStr ? " · today" : ""}`
          : e.logDate === todayStr
            ? "today"
            : "",
    }));

  // ─── Action handlers ────────────────────────────────────────────
  const handleMarkDone = useCallback(() => {
    if (!currentBookData) return;
    Alert.alert(
      "mark as finished?",
      `${currentBookData.title} will be moved to your finished shelf.`,
      [
        { text: "cancel", style: "cancel" },
        {
          text: "finish",
          style: "default",
          onPress: async () => {
            try {
              setBusyAction(true);
              await markBookFinished(currentBookData.id);
              await refresh();
            } catch (e) {
              Alert.alert(
                "couldn't mark done",
                e instanceof Error ? e.message : "try again later.",
              );
            } finally {
              setBusyAction(false);
            }
          },
        },
      ],
    );
  }, [currentBookData, refresh]);

  const handleLogProgress = useCallback(() => {
    if (!userId) return;
    Alert.prompt(
      "log progress",
      "how many pages did you read?",
      [
        { text: "cancel", style: "cancel" },
        {
          text: "log",
          onPress: async (input?: string) => {
            const pages = Number(input);
            if (!Number.isFinite(pages) || pages <= 0) {
              Alert.alert("hmm", "enter a number greater than zero.");
              return;
            }
            try {
              setBusyAction(true);
              await logProgress({ userId, pagesRead: Math.round(pages) });
              await refresh();
            } catch (e) {
              Alert.alert(
                "couldn't log",
                e instanceof Error ? e.message : "try again later.",
              );
            } finally {
              setBusyAction(false);
            }
          },
        },
      ],
      "plain-text",
      "",
      "number-pad",
    );
  }, [userId, refresh]);

  const handleSaveQuote = useCallback(() => {
    Alert.alert("coming soon", "quote capture is on the way.");
  }, []);

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
                <CurrentlyReading book={currentBook} />
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

            <QuickActions
              disabled={busyAction || !currentBookData}
              onLogProgress={handleLogProgress}
              onSaveQuote={handleSaveQuote}
              onMarkDone={handleMarkDone}
            />

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

            <RecentEntries entries={recentEntries} />
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
