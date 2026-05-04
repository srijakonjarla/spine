import { localDateStr, type StreakRun } from "@/lib/dates";

export function StreakBars({ runs }: { runs: StreakRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="h-8 flex items-end text-label text-fg-faint">
        no reading days yet
      </div>
    );
  }
  const today = localDateStr(new Date());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localDateStr(d);
  })();
  const max = Math.max(...runs.map((r) => r.length));
  return (
    <div className="flex items-end gap-[3px] h-8">
      {runs.map((r) => {
        const isCurrent = r.endDate === today || r.endDate === yesterday;
        const heightPct = Math.max(8, Math.round((r.length / max) * 100));
        const label =
          r.length === 1
            ? `1 day · ${r.startDate}`
            : `${r.length} days · ${r.startDate} → ${r.endDate}`;
        return (
          <div
            key={r.startDate}
            title={label}
            style={{ height: `${heightPct}%` }}
            className={`rounded-sm flex-1 ${isCurrent ? "bg-sage" : "bg-[var(--bg-sage-60)]"}`}
          />
        );
      })}
    </div>
  );
}
