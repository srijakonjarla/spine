import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import {
  buildMonthCells,
  computeDayPanelData,
  computeMonthSpread,
  currentStreak,
  localDateStr,
  parseLocalDate,
  stepMonth,
  streakDates,
  type Quote,
  type ReadingLogEntry,
} from "@spine/shared";
import { TopBar, homeStyles as s } from "@/components/home";
import {
  MonthHeader,
  MonthCalendar,
  NightstandSection,
  QuotesSection,
  DayPanel,
} from "@/components/month";
import { useBooks } from "@/lib/booksContext";
import { useAuth } from "@/lib/auth";
import { getReadingLog, saveLogNote, toggleDay } from "@/lib/habits";
import { getQuotes } from "@/lib/library";
import { C } from "@/components/login/tokens";

export default function CalendarTab() {
  const { session } = useAuth();
  const { books, loading: booksLoading } = useBooks();
  // Optional deep link from the year overview: /calendar?year=2026&month=3
  const params = useLocalSearchParams<{ year?: string; month?: string }>();

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => localDateStr(now), [now]);

  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const y = Number(params.year);
    const m = Number(params.month);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 0 || m > 11) return;
    setYear(y);
    setMonthIndex(m);
  }, [params.year, params.month]);

  const [logEntries, setLogEntries] = useState<ReadingLogEntry[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Reload reading log when the visible year changes; quotes aren't
  // year-scoped on the mobile API, so fetch them once per session.
  useEffect(() => {
    if (!session) {
      setLogEntries([]);
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    Promise.all([getReadingLog(year), getQuotes()])
      .then(([log, qs]) => {
        if (cancelled) return;
        setLogEntries(log);
        setQuotes(qs);
      })
      .catch(() => {
        if (cancelled) return;
        setLogEntries([]);
        setQuotes([]);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, year]);

  const isCurrentMonth =
    year === now.getFullYear() && monthIndex === now.getMonth();

  const loggedDates = useMemo(
    () => new Set(logEntries.filter((e) => e.logged).map((e) => e.logDate)),
    [logEntries],
  );
  const streakDaysSet = useMemo(() => streakDates(loggedDates), [loggedDates]);
  const streak = useMemo(() => currentStreak(loggedDates), [loggedDates]);

  const spread = useMemo(
    () =>
      computeMonthSpread({
        books,
        quotes,
        logEntries,
        year,
        monthIndex,
      }),
    [books, quotes, logEntries, year, monthIndex],
  );

  const cells = useMemo(
    () => buildMonthCells(year, monthIndex),
    [year, monthIndex],
  );

  const goToMonth = useCallback((y: number, m: number, delta = 0) => {
    const next = delta ? stepMonth(y, m, delta) : { year: y, monthIndex: m };
    setYear(next.year);
    setMonthIndex(next.monthIndex);
  }, []);

  const panel = useMemo(
    () =>
      selectedDate
        ? computeDayPanelData({
            books,
            quotes,
            logEntries,
            loggedDates,
            date: selectedDate,
          })
        : null,
    [books, quotes, logEntries, loggedDates, selectedDate],
  );

  const handleToggle = useCallback(
    (date: string) => {
      const wasLogged = loggedDates.has(date);
      setLogEntries((prev) => {
        const idx = prev.findIndex((e) => e.logDate === date);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], logged: !wasLogged };
          return next;
        }
        return [
          ...prev,
          { id: "", logDate: date, note: "", logged: true, pagesRead: 0 },
        ];
      });
      toggleDay(date).catch(() => {
        setLogEntries((prev) => {
          const idx = prev.findIndex((e) => e.logDate === date);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], logged: wasLogged };
          return next;
        });
      });
    },
    [loggedDates],
  );

  const handleNoteSave = useCallback((date: string, note: string) => {
    setLogEntries((prev) => {
      const idx = prev.findIndex((e) => e.logDate === date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], note };
        return next;
      }
      return [
        ...prev,
        { id: "", logDate: date, note, logged: false, pagesRead: 0 },
      ];
    });
    saveLogNote(date, note).catch(() => {
      // Silent fail — next reload will resync.
    });
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <TopBar />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MonthHeader
          year={year}
          monthIndex={monthIndex}
          finished={spread.finishedThisMonth.length}
          daysRead={spread.daysRead}
          streak={streak}
          quotes={spread.quotesThisMonth.length}
          isCurrentMonth={isCurrentMonth}
          onPrev={() => goToMonth(year, monthIndex, -1)}
          onNext={() => goToMonth(year, monthIndex, 1)}
          onToday={() => goToMonth(now.getFullYear(), now.getMonth())}
        />

        {booksLoading || dataLoading ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator color={C.plum} />
          </View>
        ) : (
          <>
            <MonthCalendar
              cells={cells}
              todayStr={todayStr}
              selectedDate={selectedDate}
              loggedDates={loggedDates}
              streakDates={streakDaysSet}
              finishedDates={spread.finishedDatesThisMonth}
              quoteDates={spread.quoteDatesThisMonth}
              noteDates={spread.noteDatesThisMonth}
              onSelectDate={(d) => {
                if (!parseLocalDate(d)) return;
                setSelectedDate(d);
              }}
            />
            <NightstandSection
              reading={spread.reading}
              upNext={spread.upNext}
              finishedThisMonth={spread.finishedThisMonth}
            />
            <QuotesSection quotes={spread.quotesThisMonth} />
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <DayPanel
        open={selectedDate !== null}
        date={selectedDate}
        todayStr={todayStr}
        initialNote={panel?.log?.note ?? ""}
        isLogged={panel?.isLogged ?? false}
        started={panel?.started ?? []}
        finished={panel?.finished ?? []}
        quotes={panel?.quotes ?? []}
        onClose={() => setSelectedDate(null)}
        onToggle={handleToggle}
        onNoteSave={handleNoteSave}
      />
    </SafeAreaView>
  );
}
