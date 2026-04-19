import { Thought } from "@/types";
import { timeOfDayEmoji } from "./helpers";
import { SparkleIcon } from "@phosphor-icons/react";

interface EntryRowProps {
  thought: Thought;
  /** Previous page number in chronological order — null if none yet. */
  prevPage: number | null;
  isFinished: boolean;
  onDelete: (id: string) => void;
}

/** A single reading-session row in the timeline. */
export default function EntryRow({
  thought,
  prevPage,
  isFinished,
  onDelete,
}: EntryRowProps) {
  const currPage = thought.pageNumber ?? null;
  // Missing previous page is treated as 0 so the very first entry still has a pages-read badge.
  const pagesRead = currPage != null ? currPage - (prevPage ?? 0) : null;

  return (
    <div className="group thought-row">
      <span className="thought-date">
        {new Date(thought.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}{" "}
        · {timeOfDayEmoji(thought.createdAt)}
      </span>
      {currPage != null && (
        <span className="thought-pages">
          p. {prevPage ?? 0} → {currPage}
        </span>
      )}
      <span className="thought-note">{thought.text}</span>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {isFinished && (
          <span className="thought-badge-finished">
            finished
            <SparkleIcon weight="fill" size={10} color="var(--terra)" />
          </span>
        )}
        {pagesRead != null && pagesRead > 0 && (
          <span className="thought-badge-pages">{pagesRead} pages</span>
        )}
        <button
          onClick={() => onDelete(thought.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity btn-delete"
        >
          delete
        </button>
      </div>
    </div>
  );
}
