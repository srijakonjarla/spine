interface SummaryStatsProps {
  sessions: number;
  pages: number | string;
  avgPerDay: number | null;
  quotes: number;
}

/** 2x2 grid of summary stat cards (Sessions / Pages / Avg p/day / Quotes). */
export default function SummaryStats({
  sessions,
  pages,
  avgPerDay,
  quotes,
}: SummaryStatsProps) {
  const items: { val: number | string; lbl: string }[] = [
    { val: sessions, lbl: "Sessions" },
    { val: pages, lbl: "Pages" },
    ...(avgPerDay !== null ? [{ val: avgPerDay, lbl: "Avg p/day" }] : []),
    { val: quotes, lbl: "Quotes" },
  ];

  return (
    <>
      <p className="timeline-section-label mb-3">Summary</p>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {items.map(({ val, lbl }) => (
          <div
            key={lbl}
            className="rounded-xl px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-light)]"
          >
            <p className="font-serif text-[22px] font-bold text-plum leading-none">
              {val}
            </p>
            <p className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-light mt-2">
              {lbl}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
