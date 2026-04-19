import type { BookEntry } from "@/types";
import { SectionLabel } from "./SectionLabel";
import { BarList } from "./BarList";
import { RatingBar } from "./RatingBar";

interface RatingsAndFormatsProps {
  ratingDist: Record<number, number>;
  maxRatingCount: number;
  dnfs: BookEntry[];
  formatCounts: [string, number][];
}

/** Two-column panel: star rating histogram + DNF row, and format breakdown. */
export function RatingsAndFormats({
  ratingDist,
  maxRatingCount,
  dnfs,
  formatCounts,
}: RatingsAndFormatsProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-12 mb-14">
      <div>
        <SectionLabel>star ratings & dnf</SectionLabel>
        <div className="space-y-2 mb-4">
          {[5, 4, 3, 2, 1].map((s) => (
            <RatingBar
              key={s}
              stars={s}
              count={ratingDist[s] ?? 0}
              max={maxRatingCount}
            />
          ))}
        </div>
        {dnfs.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line">
            <span className="text-caption text-fg-faint w-5 text-right shrink-0">
              dnf
            </span>
            <div className="flex-1 h-4 rounded bg-edge overflow-hidden">
              <div
                style={{
                  width: `${(dnfs.length / Math.max(maxRatingCount, dnfs.length)) * 100}%`,
                }}
                className="h-full rounded bg-terra/50 transition-all duration-500"
              />
            </div>
            <span className="text-caption text-fg-faint w-4 shrink-0">
              {dnfs.length}
            </span>
          </div>
        )}
      </div>
      {formatCounts.length > 0 && (
        <div>
          <SectionLabel>by format / edition</SectionLabel>
          <BarList
            items={formatCounts}
            max={formatCounts[0][1]}
            color="gradient"
          />
        </div>
      )}
    </div>
  );
}
