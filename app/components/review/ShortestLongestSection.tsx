import type { BookEntry } from "@/types";
import { SectionLabel } from "./SectionLabel";
import { BookRow } from "./BookRow";
import { fmtHours, fmtPages } from "./helpers";

interface ShortestLongestSectionProps {
  shortestPrint: BookEntry | null;
  longestPrint: BookEntry | null;
  shortestAudio: BookEntry | null;
  longestAudio: BookEntry | null;
}

/** Side-by-side "shortest & longest" panels split by print vs audio. */
export function ShortestLongestSection({
  shortestPrint,
  longestPrint,
  shortestAudio,
  longestAudio,
}: ShortestLongestSectionProps) {
  if (!shortestPrint && !shortestAudio) return null;
  return (
    <div className="mb-14">
      <SectionLabel>shortest & longest reads</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-6">
        {(shortestPrint || longestPrint) && (
          <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
            <p className="text-caption text-fg-faint uppercase tracking-wide">
              print
            </p>
            {shortestPrint && (
              <div>
                <p className="text-detail text-fg-faint mb-0.5">shortest</p>
                <BookRow
                  book={shortestPrint}
                  meta={`${fmtPages(shortestPrint.pageCount!)} pp`}
                />
              </div>
            )}
            {longestPrint && longestPrint.id !== shortestPrint?.id && (
              <div>
                <p className="text-detail text-fg-faint mb-0.5">longest</p>
                <BookRow
                  book={longestPrint}
                  meta={`${fmtPages(longestPrint.pageCount!)} pp`}
                />
              </div>
            )}
          </div>
        )}
        {(shortestAudio || longestAudio) && (
          <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
            <p className="text-caption text-fg-faint uppercase tracking-wide">
              audio
            </p>
            {shortestAudio && (
              <div>
                <p className="text-detail text-fg-faint mb-0.5">shortest</p>
                <BookRow
                  book={shortestAudio}
                  meta={fmtHours(shortestAudio.audioDurationMinutes!)}
                />
              </div>
            )}
            {longestAudio && longestAudio.id !== shortestAudio?.id && (
              <div>
                <p className="text-detail text-fg-faint mb-0.5">longest</p>
                <BookRow
                  book={longestAudio}
                  meta={fmtHours(longestAudio.audioDurationMinutes!)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
