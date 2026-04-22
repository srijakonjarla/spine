import { avgPagesPerDay } from "@/lib/books";
import { parseLocalDate, localDateStr } from "@/lib/dates";
import { addThought, removeThought } from "@/lib/db";
import { Thought } from "@/types";
import { useState, useRef, useMemo } from "react";
import { useBook } from "@/providers/BookContext";

import DaysStrip from "./timeline/DaysStrip";
import EntriesList from "./timeline/EntriesList";
import Composer from "./timeline/Composer";
import SummaryStats from "./timeline/SummaryStats";
import BestReadingDay, { type BestDay } from "./timeline/BestReadingDay";
import TimeOfDay from "./timeline/TimeOfDay";
import ReadingPeriod from "./timeline/ReadingPeriod";
import { timeOfDayLabel } from "./timeline/helpers";

/**
 * Orchestrator for the "Timeline" tab. Owns the book-scoped state + derived
 * data and composes the individual presentational sub-components from
 * `./timeline/*`.
 */
export default function TimelineTab() {
  const { entry, quotes, onUpdate, selectedReadId } = useBook();
  const [thoughtInput, setThoughtInput] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [dateInput, setDateInput] = useState(localDateStr());
  const [isPosting, setIsPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // When a historical read is selected, scope the timeline to that read's date range
  const viewedRead = selectedReadId
    ? (entry.reads.find((r) => r.id === selectedReadId) ?? null)
    : null;

  const dateStarted = viewedRead?.dateStarted ?? entry.dateStarted;
  const dateFinished = viewedRead?.dateFinished ?? entry.dateFinished;

  // Filter thoughts to the viewed read's date range when a historical read is selected
  const visibleThoughts = useMemo(() => {
    if (!viewedRead) return entry.thoughts;
    const start = viewedRead.dateStarted
      ? new Date(viewedRead.dateStarted).getTime()
      : null;
    const end = viewedRead.dateFinished
      ? new Date(viewedRead.dateFinished).getTime() + 86400000 // inclusive
      : null;
    return entry.thoughts.filter((t) => {
      const ts = new Date(t.createdAt).getTime();
      if (start && ts < start) return false;
      if (end && ts > end) return false;
      return true;
    });
  }, [entry.thoughts, viewedRead]);

  const sortedThoughts = useMemo(
    () =>
      [...visibleThoughts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [visibleThoughts],
  );

  const calendarDays = useMemo(() => {
    if (!dateStarted) return [];
    const start = parseLocalDate(dateStarted);
    const end = dateFinished ? parseLocalDate(dateFinished) : new Date();
    if (!start || !end) return [];
    const days: { date: Date; dateStr: string }[] = [];
    const d = new Date(start);
    while (d <= end && days.length < 60) {
      days.push({ date: new Date(d), dateStr: localDateStr(d) });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [dateStarted, dateFinished]);

  const thoughtsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of visibleThoughts) {
      const key = localDateStr(new Date(t.createdAt));
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [visibleThoughts]);

  // Pages read per day — previous page defaults to 0 for the very first entry
  const pagesByDay = useMemo(() => {
    const withPages = [...visibleThoughts]
      .filter((t) => t.pageNumber != null)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    const map: Record<string, number> = {};
    for (let i = 0; i < withPages.length; i++) {
      const prev = i > 0 ? withPages[i - 1].pageNumber! : 0;
      const delta = withPages[i].pageNumber! - prev;
      if (delta <= 0) continue;
      const day = localDateStr(new Date(withPages[i].createdAt));
      map[day] = (map[day] ?? 0) + delta;
    }
    return map;
  }, [visibleThoughts]);

  // Best reading day — prefers page-delta data, falls back to note count
  const bestDay = useMemo<BestDay | null>(() => {
    if (visibleThoughts.length === 0) return null;

    const noteByDay: Record<string, string> = {};
    const notesPerDay: Record<string, number> = {};

    const thoughtsAsc = [...visibleThoughts].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    for (const t of thoughtsAsc) {
      const day = localDateStr(new Date(t.createdAt));
      notesPerDay[day] = (notesPerDay[day] ?? 0) + 1;
      noteByDay[day] = t.text;
    }

    const pageEntries = Object.entries(pagesByDay);
    if (pageEntries.length > 0) {
      const [dateStr, pages] = pageEntries.sort((a, b) => b[1] - a[1])[0];
      return {
        dateStr,
        pages,
        notes: notesPerDay[dateStr] ?? 0,
        note: noteByDay[dateStr] ?? "",
      };
    }

    const noteEntries = Object.entries(notesPerDay);
    if (noteEntries.length === 0) return null;
    const [dateStr, notes] = noteEntries.sort((a, b) => b[1] - a[1])[0];
    return { dateStr, pages: null, notes, note: noteByDay[dateStr] ?? "" };
  }, [visibleThoughts, pagesByDay]);

  // Reading time-of-day distribution (4 slots)
  const timeOfDay = useMemo(() => {
    const counts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const t of visibleThoughts) counts[timeOfDayLabel(t.createdAt)]++;
    return counts;
  }, [visibleThoughts]);

  const dominantSlot = useMemo(() => {
    const entries = Object.entries(timeOfDay) as [
      keyof typeof timeOfDay,
      number,
    ][];
    const [slot, count] = entries.sort((a, b) => b[1] - a[1])[0];
    return count > 0 ? slot : null;
  }, [timeOfDay]);

  const finishedDateStr = dateFinished ?? null;

  const postThought = async () => {
    const text = thoughtInput.trim();
    if (!text || isPosting || !entry) return;
    setIsPosting(true);
    const pageNumber = pageInput.trim() ? parseInt(pageInput.trim(), 10) : null;

    // Use the selected date for the timestamp. If backdated, set time to noon
    // so it sorts naturally within that day.
    const today = localDateStr();
    const isBackdated = dateInput !== today;
    const createdAt = isBackdated
      ? `${dateInput}T12:00:00.000Z`
      : new Date().toISOString();

    const thought: Thought = {
      id: crypto.randomUUID(),
      text,
      pageNumber: pageNumber && !isNaN(pageNumber) ? pageNumber : null,
      createdAt,
    };
    onUpdate({ thoughts: [...entry.thoughts, thought] });
    setThoughtInput("");
    setPageInput("");
    setDateInput(today);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
    try {
      await addThought(entry.id, thought);
    } finally {
      setIsPosting(false);
    }
  };

  const deleteThought = async (thoughtId: string) => {
    onUpdate({ thoughts: entry.thoughts.filter((t) => t.id !== thoughtId) });
    await removeThought(thoughtId, entry.id);
  };

  return (
    <div className="grid bg-cream md:grid-cols-[1fr_280px]">
      {/* Main column */}
      <div className="px-4 sm:px-9 py-5 sm:py-7 pb-8 sm:pb-10">
        <DaysStrip
          calendarDays={calendarDays}
          thoughtsByDay={thoughtsByDay}
          pagesByDay={pagesByDay}
          finishedDateStr={finishedDateStr}
        />
        <EntriesList
          sortedThoughts={sortedThoughts}
          finishedDateStr={finishedDateStr}
          onDelete={deleteThought}
          bottomRef={bottomRef}
        />
        <Composer
          pageInput={pageInput}
          thoughtInput={thoughtInput}
          onPageInputChange={setPageInput}
          onThoughtInputChange={setThoughtInput}
          onPost={postThought}
          hidden={!!viewedRead}
          dateValue={dateInput}
          onDateChange={setDateInput}
        />
      </div>

      {/* Sidebar */}
      <div className="px-4 sm:px-[22px] py-4 sm:py-[22px] bg-plum-trace md:border-l border-t md:border-t-0 border-line overflow-y-auto">
        <SummaryStats
          sessions={sortedThoughts.length}
          pages={entry.pageCount ?? "—"}
          avgPerDay={avgPagesPerDay(entry)}
          quotes={quotes.length}
        />
        <BestReadingDay bestDay={bestDay} />
        {visibleThoughts.length > 0 && (
          <TimeOfDay timeOfDay={timeOfDay} dominantSlot={dominantSlot} />
        )}
        <ReadingPeriod
          dateStarted={dateStarted}
          dateFinished={dateFinished}
          isOngoing={!viewedRead && entry.status === "reading"}
        />
      </div>
    </div>
  );
}
