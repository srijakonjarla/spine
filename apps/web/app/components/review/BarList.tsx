import { ProgressBar } from "@/components/ProgressBar";

interface BarListProps {
  items: [string, number][];
  max: number;
  color?: string;
}

/** Stacked list of labeled horizontal bars — used for formats, genres, etc. */
export function BarList({ items, max, color = "gradient" }: BarListProps) {
  return (
    <div className="space-y-2.5">
      {items.map(([label, count]) => (
        <div key={label}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-fg capitalize">{label}</span>
            <span className="text-xs text-fg-faint">{count}</span>
          </div>
          <ProgressBar value={count / max} color={color} />
        </div>
      ))}
    </div>
  );
}
