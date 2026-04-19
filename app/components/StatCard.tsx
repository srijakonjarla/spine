interface StatCardProps {
  label: string;
  value: string | number;
  /** Optional border-top accent, e.g. "border-t-stat-books" */
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
      className={`rounded-2xl p-5 bg-surface border border-line ${borderTop}`}
    >
      <p className="text-2xl font-bold text-fg-heading">{value}</p>
      <p className="text-xs mt-1 text-fg-faint">{label}</p>
      {children}
    </div>
  );
}
