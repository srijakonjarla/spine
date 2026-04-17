import { StatCard } from "@/components/StatCard";
import { avgPagesPerDay } from "@/lib/books";
import {
  parseLocalDate,
  localDateStr,
  formatShortDate,
  daysApart,
} from "@/lib/dates";
import { addThought, removeThought } from "@/lib/db";
import { Thought } from "@/types";
import { useState, useRef, useMemo } from "react";
import { useBook } from "@/providers/BookContext";

// ─── Tab: Timeline ────────────────────────────────────────────────

/** Returns a time-of-day emoji for a given ISO timestamp. */
function timeOfDayEmoji(iso: string): string {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return "☀️";
  if (h >= 12 && h < 17) return "🌤️";
  if (h >= 17 && h < 21) return "🌆";
  return "🌙";
}

export default function TimelineTab() {
  const { entry, onUpdate, selectedReadId } = useBook();
  const [thoughtInput, setThoughtInput] = useState("");
  const [pageInput, setPageInput] = useState("");
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

  const finishedDateStr = dateFinished ?? null;

  const postThought = async () => {
    const text = thoughtInput.trim();
    if (!text || isPosting || !entry) return;
    setIsPosting(true);
    const pageNumber = pageInput.trim() ? parseInt(pageInput.trim(), 10) : null;
    const thought: Thought = {
      id: crypto.randomUUID(),
      text,
      pageNumber: pageNumber && !isNaN(pageNumber) ? pageNumber : null,
      createdAt: new Date().toISOString(),
    };
    onUpdate({ thoughts: [...entry.thoughts, thought] });
    setThoughtInput("");
    setPageInput("");
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

  const deleteT = async (thoughtId: string) => {
    onUpdate({ thoughts: entry.thoughts.filter((t) => t.id !== thoughtId) });
    await removeThought(thoughtId, entry.id);
  };

  const legendItems = [
    { bg: "var(--bg-plum-trace)", label: "no entry" },
    { bg: "var(--bg-sage-25)", label: "logged" },
    { bg: "var(--terra)", label: "finished" },
  ];

  return (
    <div className="grid bg-cream" style={{ gridTemplateColumns: "1fr 280px" }}>
      {/* Main column */}
      <div className="px-9 py-7 pb-10">
        {/* Calendar strip */}
        {calendarDays.length > 0 && (
          <div className="mb-7">
            <p className="font-hand text-[13px] text-ink-light mb-2.5">
              days you spent with this book
            </p>
            <div className="flex gap-[5px] flex-wrap">
              {calendarDays.map(({ date, dateStr }) => {
                const count = thoughtsByDay[dateStr] || 0;
                const isFinish = dateStr === finishedDateStr;
                let bg = "var(--bg-plum-trace)";
                if (isFinish)
                  bg =
                    "linear-gradient(135deg, var(--terra), rgba(201,123,90,0.7))";
                else if (count >= 3) bg = "var(--bg-sage-50)";
                else if (count >= 1) bg = "var(--bg-sage-25)";
                const color = isFinish
                  ? "white"
                  : count > 0
                    ? "var(--plum)"
                    : "var(--ink-light)";
                return (
                  <div
                    key={dateStr}
                    title={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${count ? ` · ${count} note${count !== 1 ? "s" : ""}` : ""}`}
                    className="timeline-day"
                    style={{ background: bg, color }}
                  >
                    <span>{date.getDate()}</span>
                    {isFinish && (
                      <span className="text-[7px] text-white/85">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2.5 flex-wrap">
              {legendItems.map(({ bg, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-[5px] text-[10px] text-ink-light font-sans"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[2px] inline-block"
                    style={{ background: bg }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="mb-6">
          {sortedThoughts.length === 0 ? (
            <p className="font-hand text-base text-fg-faint">
              no reading notes yet — add one below
            </p>
          ) : (
            <div className="flex flex-col">
              {sortedThoughts.map((thought, i) => {
                // sortedThoughts is newest-first; slice(i+1) gives older entries
                const prevPage =
                  sortedThoughts
                    .slice(i + 1)
                    .find((t) => t.pageNumber != null)?.pageNumber ?? null;
                const currPage = thought.pageNumber ?? null;

                return (
                  <div key={thought.id} className="group thought-row">
                    <div className="w-[110px] shrink-0 pt-0.5">
                      {currPage != null ? (
                        <span className="font-hand text-[13px] text-terra">
                          {prevPage != null
                            ? `p.${prevPage} → ${currPage}`
                            : `p.${currPage}`}
                        </span>
                      ) : (
                        <span className="font-hand text-[13px] text-terra">
                          {formatShortDate(thought.createdAt)} ·{" "}
                          {timeOfDayEmoji(thought.createdAt)}
                        </span>
                      )}
                      {currPage != null && (
                        <p className="font-hand text-[11px] text-ink-light leading-none mt-0.5">
                          {formatShortDate(thought.createdAt)}
                        </p>
                      )}
                    </div>
                    <span className="font-hand text-[15px] leading-[1.55] flex-1" style={{ color: "var(--pen-color, var(--ink))" }}>
                      {thought.text}
                    </span>
                    <button
                      onClick={() => deleteT(thought.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity btn-delete shrink-0"
                    >
                      delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Add thought — hidden when viewing a historical read */}
        <div className={`flex gap-2 items-start${viewedRead ? " hidden" : ""}`}>
          <input
            type="number"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                postThought();
              }
            }}
            placeholder="p."
            min={1}
            className="w-16 shrink-0 font-hand text-[13px] text-ink border-b border-[var(--border-light)] bg-transparent outline-none placeholder:text-ink-light/50 pb-1 pt-1 text-center"
          />
          <textarea
            value={thoughtInput}
            onChange={(e) => setThoughtInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                postThought();
              }
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
            placeholder="add a reading note... (enter to post, shift+enter for newline)"
            rows={2}
            className="timeline-thought-input flex-1"
          />
        </div>
        {!viewedRead && <p className="hint-text mt-1.5">↵ to post · shift+↵ for newline</p>}
      </div>

      {/* Sidebar */}
      <div className="px-[22px] py-[22px] bg-[var(--bg-plum-trace)] border-l border-[var(--border-light)]">
        <p className="section-label mb-3">Summary</p>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {[
            { val: sortedThoughts.length, lbl: "Entries" },
            { val: entry.pageCount ?? "—", lbl: "Pages" },
            ...(avgPagesPerDay(entry) !== null
              ? [{ val: avgPagesPerDay(entry)!, lbl: "Avg p/day" }]
              : []),
          ].map(({ val, lbl }) => (
            <StatCard key={lbl} label={lbl} value={val} />
          ))}
        </div>

        {dateStarted && (
          <>
            <p className="section-label mb-2.5">Reading period</p>
            <div className="book-surface p-3 mb-5">
              <p className="font-hand text-sm text-plum">
                {formatShortDate(dateStarted)}
                {(dateFinished || (!viewedRead && entry.status === "reading")) && (
                  <>
                    {" "}
                    →{" "}
                    {dateFinished ? formatShortDate(dateFinished) : "now"}
                  </>
                )}
              </p>
              <p className="text-[11px] text-ink-light font-sans mt-1">
                {daysApart(dateStarted, dateFinished || localDateStr()) + 1}{" "}
                days
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
