import { ProgressBar } from "@/components/ProgressBar";
import { SectionLabel } from "./SectionLabel";

interface GenreSectionProps {
  items: [string, number][];
}

/** Two-column "genres & sub-genres" section with progress bars. */
export function GenreSection({ items }: GenreSectionProps) {
  if (!items.length) return null;
  return (
    <div className="mb-14">
      <SectionLabel>genres & sub-genres</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-2.5">
        {items.map(([genre, count]) => (
          <div key={genre}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-[var(--fg)]">{genre}</span>
              <span className="text-xs text-[var(--fg-faint)]">{count}</span>
            </div>
            <ProgressBar value={count / (items[0][1] || 1)} color="gradient" />
          </div>
        ))}
      </div>
    </div>
  );
}
