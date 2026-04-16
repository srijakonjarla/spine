import Link from "next/link";
import { MONTH_ABBRS, MONTH_NAMES } from "@/lib/constants";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function MiniMonthCal({
  year,
  monthIndex,
  loggedDates,
  finishedDates,
  todayStr,
  isCurrentYear,
}: {
  year: number;
  monthIndex: number;
  loggedDates: Set<string>;
  finishedDates: Set<string>;
  todayStr: string;
  isCurrentYear: boolean;
}) {
  const monthKey = `${year}-${pad(monthIndex + 1)}`;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDOW = new Date(year, monthIndex, 1).getDay();
  const isThisMonth = todayStr.startsWith(monthKey);

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDOW; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${monthKey}-${pad(d)}`);

  const booksThisMonth = Array.from(finishedDates).filter((d) =>
    d.startsWith(monthKey),
  ).length;
  const daysLoggedThisMonth = Array.from(loggedDates).filter((d) =>
    d.startsWith(monthKey),
  ).length;
  const monthHasActivity = daysLoggedThisMonth > 0 || booksThisMonth > 0;
  const firstDayOfMonth = `${monthKey}-01`;
  const isFutureMonth = isCurrentYear && firstDayOfMonth > todayStr;

  return (
    <Link
      href={`/${year}/${MONTH_ABBRS[monthIndex]}`}
      className={`flex flex-col rounded-xl p-3 transition-opacity hover:opacity-80 bg-[var(--bg-surface)] ${
        isThisMonth
          ? "border-[1.5px] border-[var(--border-terra-soft)]"
          : "border border-[var(--border-light)]"
      } ${isFutureMonth ? "opacity-[0.45]" : "aspect-4/3"}`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-semibold text-[var(--fg-muted)]">
          {MONTH_NAMES[monthIndex]}
        </p>
        {booksThisMonth > 0 && (
          <p className="text-[9px] text-sage">
            {booksThisMonth} {booksThisMonth === 1 ? "book" : "books"}
          </p>
        )}
        {isFutureMonth && (
          <p className="text-md font-[family-name:var(--font-caveat)] text-[var(--fg-faint)]">
            not yet written
          </p>
        )}
      </div>

      {isFutureMonth ? null : (
        <div className="flex-1 grid grid-cols-7 gap-[2px] [grid-auto-rows:1fr]">
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const isFuture = isCurrentYear && dateStr > todayStr;
            const isFinish = finishedDates.has(dateStr);
            const isLogged = loggedDates.has(dateStr);
            const isToday = dateStr === todayStr;

            const bgClass = isToday
              ? "bg-plum"
              : isFinish
                ? "bg-[var(--bg-terra-70)]"
                : isLogged
                  ? "bg-[var(--bg-sage-50)]"
                  : isFuture
                    ? "bg-[var(--bg-plum-trace)]"
                    : "bg-[var(--bg-plum-soft)]";

            return (
              <div
                key={i}
                className={`rounded-[2px] ${isFuture ? "opacity-40" : ""} ${bgClass}`}
              />
            );
          })}
        </div>
      )}

      {!isFutureMonth && !monthHasActivity && (
        <p className="text-[9px] font-[family-name:var(--font-caveat)] mt-1 text-[var(--fg-faint)]">
          no days logged
        </p>
      )}
    </Link>
  );
}
