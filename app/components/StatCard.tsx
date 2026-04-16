interface StatCardProps {
  label: string;
  value: string | number;
  /** Optional border-top accent, e.g. "border-t-[var(--stat-border-books)]" */
  accentClass?: string;
  children?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  accentClass,
  children,
}: StatCardProps) {
  const borderTop = accentClass ? `border-t-[3px] ${accentClass}` : "";
  return (
    <div
      className={`rounded-2xl p-5 bg-[var(--bg-surface)] border border-[var(--border-light)] ${borderTop}`}
    >
      <p className="text-2xl font-bold text-[var(--fg-heading)]">{value}</p>
      <p className="text-xs mt-1 text-[var(--fg-faint)]">{label}</p>
      {children}
    </div>
  );
}
