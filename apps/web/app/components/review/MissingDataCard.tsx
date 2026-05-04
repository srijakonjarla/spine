import type { BookEntry } from "@/types";
import { BookRow } from "./BookRow";

interface MissingDataCardProps {
  printMissingPages: BookEntry[];
  audioMissingHours: BookEntry[];
}

/** Nudge card: books missing page counts or audio durations that skew stats. */
export function MissingDataCard({
  printMissingPages,
  audioMissingHours,
}: MissingDataCardProps) {
  if (!printMissingPages.length && !audioMissingHours.length) return null;
  return (
    <div className="mb-14 rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-fg mb-2">
        Add missing details to make these counts accurate.
      </p>
      <p className="text-xs text-fg-faint mb-4">
        Tap a book to fill in the length.
      </p>
      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
        {printMissingPages.length > 0 && (
          <div>
            <p className="text-caption text-fg-faint uppercase tracking-wide mb-2">
              missing page count · {printMissingPages.length}
            </p>
            <div className="space-y-0.5">
              {printMissingPages.map((b) => (
                <BookRow key={b.id} book={b} meta="add pages" />
              ))}
            </div>
          </div>
        )}
        {audioMissingHours.length > 0 && (
          <div>
            <p className="text-caption text-fg-faint uppercase tracking-wide mb-2">
              missing audio length · {audioMissingHours.length}
            </p>
            <div className="space-y-0.5">
              {audioMissingHours.map((b) => (
                <BookRow key={b.id} book={b} meta="add hours" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
