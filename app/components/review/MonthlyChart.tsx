import { SectionLabel } from "./SectionLabel";

interface MonthlyChartProps {
  months: { key: string; label: string; count: number }[];
  maxMonthly: number;
}

/** "Books per month" 12-bar chart across the year. */
export function MonthlyChart({ months, maxMonthly }: MonthlyChartProps) {
  return (
    <div className="mb-14">
      <SectionLabel>books per month</SectionLabel>
      <div className="flex items-end gap-1.5 h-28">
        {months.map((m) => (
          <div
            key={m.key}
            className="flex-1 flex flex-col justify-end items-center gap-1 h-full"
          >
            <div
              style={
                m.count > 0
                  ? { height: `${Math.round((m.count / maxMonthly) * 100)}%` }
                  : undefined
              }
              className={`w-full rounded-t-sm transition-all min-h-[2px] ${
                m.count > 0
                  ? "[background-image:var(--gradient-chart-month)]"
                  : "bg-[var(--border-light)] h-[2px]"
              }`}
            />
            <span className="text-[9px] text-[var(--fg-faint)]">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
