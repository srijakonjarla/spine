import { useState } from "react";
import { localDateStr } from "@/lib/dates";

interface ComposerProps {
  pageInput: string;
  thoughtInput: string;
  onPageInputChange: (v: string) => void;
  onThoughtInputChange: (v: string) => void;
  onPost: () => void;
  hidden: boolean;
  /** Currently selected date for the thought (YYYY-MM-DD). */
  dateValue: string;
  onDateChange: (v: string) => void;
}

/** The "add a reading note" input row at the bottom of the timeline. */
export default function Composer({
  pageInput,
  thoughtInput,
  onPageInputChange,
  onThoughtInputChange,
  onPost,
  hidden,
  dateValue,
  onDateChange,
}: ComposerProps) {
  const [showDate, setShowDate] = useState(false);
  const today = localDateStr();
  const isBackdated = dateValue !== today;

  return (
    <>
      <div className={`flex gap-2 items-start${hidden ? " hidden" : ""}`}>
        <input
          type="number"
          value={pageInput}
          onChange={(e) => onPageInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onPost();
            }
          }}
          placeholder="p."
          min={1}
          className="w-16 shrink-0 font-hand text-note text-fg border-b border-line bg-transparent outline-none placeholder:text-fg-muted/50 pb-1 pt-1 text-center"
        />
        <textarea
          value={thoughtInput}
          onChange={(e) => onThoughtInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onPost();
            }
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          placeholder="add a reading note... (enter to post, shift+enter for newline)"
          rows={2}
          className="timeline-thought-input flex-1"
        />
      </div>
      {!hidden && (
        <div className="flex items-center gap-3 mt-1.5">
          <p className="hint-text">↵ to post · shift+↵ for newline</p>
          <button
            type="button"
            onClick={() => {
              setShowDate(!showDate);
              if (showDate) onDateChange(today);
            }}
            className={`hint-text transition-colors ${isBackdated ? "text-terra" : "hover:text-fg-muted"}`}
          >
            {isBackdated ? `logging for ${formatShort(dateValue)}` : "backdate"}
          </button>
        </div>
      )}
      {!hidden && showDate && (
        <div className="mt-2">
          <input
            type="date"
            value={dateValue}
            max={today}
            onChange={(e) => onDateChange(e.target.value)}
            className="text-xs bg-transparent border border-line rounded-lg px-2.5 py-1.5 text-fg outline-none focus:border-terra transition-colors"
          />
        </div>
      )}
    </>
  );
}

function formatShort(iso: string) {
  const [, m, d] = iso.split("-");
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  return `${months[Number(m) - 1]} ${Number(d)}`;
}
