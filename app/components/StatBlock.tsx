interface StatBlockProps {
  value: number | string;
  label: string;
}

export function StatBlock({ value, label }: StatBlockProps) {
  return (
    <div>
      <p className="text-xl font-semibold text-stone-800">{value}</p>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  );
}
