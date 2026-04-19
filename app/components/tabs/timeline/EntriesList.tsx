import { RefObject } from "react";
import { Thought } from "@/types";
import { localDateStr } from "@/lib/dates";
import EntryRow from "./EntryRow";

interface EntriesListProps {
  /** Thoughts sorted newest-first. */
  sortedThoughts: Thought[];
  finishedDateStr: string | null;
  onDelete: (id: string) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
}

/** Scrollable list of timeline entries, or an empty-state line. */
export default function EntriesList({
  sortedThoughts,
  finishedDateStr,
  onDelete,
  bottomRef,
}: EntriesListProps) {
  return (
    <div className="mb-6">
      {sortedThoughts.length === 0 ? (
        <p className="font-hand text-base text-fg-faint">
          no reading notes yet — add one below
        </p>
      ) : (
        <div className="flex flex-col">
          {sortedThoughts.map((thought, i) => {
            // sortedThoughts is newest-first; slice(i+1) gives older entries
            const prevPage =
              sortedThoughts.slice(i + 1).find((t) => t.pageNumber != null)
                ?.pageNumber ?? null;
            const thoughtDateStr = localDateStr(new Date(thought.createdAt));
            const isFinished =
              finishedDateStr !== null && thoughtDateStr === finishedDateStr;
            return (
              <EntryRow
                key={thought.id}
                thought={thought}
                prevPage={prevPage}
                isFinished={isFinished}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
