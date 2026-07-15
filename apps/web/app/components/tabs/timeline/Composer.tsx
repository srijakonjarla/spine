import { useEffect, useState } from "react";
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
  /** Total page count of the book — enables % mode when provided. */
  pageCount?: number | null;
}

type PageMode = "page" | "percent";

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
  pageCount,
}: ComposerProps) {
  const [showDate, setShowDate] = useState(false);
  const [pageMode, setPageMode] = useState<PageMode>("page");
  const [displayValue, setDisplayValue] = useState("");
  const today = localDateStr();
  const isBackdated = dateValue !== today;
  const canUsePercent = !!pageCount && pageCount > 0;

  // When parent resets pageInput to "" (after post), clear display value
  useEffect(() => {
    if (pageInput === "") setDisplayValue("");
  }, [pageInput]);

  const handleDisplayChange = (v: string) => {
    setDisplayValue(v);
    if (pageMode === "page") {
      onPageInputChange(v);
    } else {
      const n = Number(v);
      if (canUsePercent && Number.isFinite(n) && n > 0 && n <= 100) {
        onPageInputChange(String(Math.round((n / 100) * pageCount)));
      } else {
        onPageInputChange("");
      }
    }
  };

  const toggleMode = () => {
    if (!canUsePercent) return;
    const next: PageMode = pageMode === "page" ? "percent" : "page";
    setPageMode(next);
    setDisplayValue("");
    onPageInputChange("");
  };

  const percentPage =
    pageMode === "percent" && canUsePercent && displayValue.trim()
      ? (() => {
          const n = Number(displayValue);
          return Number.isFinite(n) && n > 0 && n <= 100
            ? Math.round((n / 100) * pageCount)
            : null;
        })()
      : null;

  return (
    <>
      <div className={`flex gap-2 items-start${hidden ? " hidden" : ""}`}>
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={toggleMode}
            title={
              canUsePercent ? "toggle page / %" : "add a page count to use %"
            }
            className={`text-detail font-medium leading-none px-1.5 py-0.5 rounded transition-colors select-none ${
              pageMode === "percent"
                ? "bg-terra/15 text-terra"
                : "text-fg-muted/50 hover:text-fg-muted"
            } ${!canUsePercent ? "cursor-default" : "cursor-pointer"}`}
          >
            {pageMode === "page" ? "p." : "%"}
          </button>
          <input
            id="composer-page"
            type="number"
            value={displayValue}
            onChange={(e) => handleDisplayChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onPost();
              }
            }}
            placeholder={pageMode === "page" ? "—" : "0"}
            min={1}
            max={pageMode === "percent" ? 100 : undefined}
            className="w-12 font-hand text-note text-fg border-b border-line bg-transparent outline-none placeholder:text-fg-muted/30 pb-1 pt-0.5 text-center"
          />
          {percentPage != null && (
            <span className="text-detail text-fg-muted/60 leading-none">
              p. {percentPage}
            </span>
          )}
        </div>
        <textarea
          id="composer-thought"
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
            id="composer-date"
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
