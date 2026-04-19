interface ComposerProps {
  pageInput: string;
  thoughtInput: string;
  onPageInputChange: (v: string) => void;
  onThoughtInputChange: (v: string) => void;
  onPost: () => void;
  hidden: boolean;
}

/** The "add a reading note" input row at the bottom of the timeline. */
export default function Composer({
  pageInput,
  thoughtInput,
  onPageInputChange,
  onThoughtInputChange,
  onPost,
  hidden,
}: ComposerProps) {
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
        <p className="hint-text mt-1.5">↵ to post · shift+↵ for newline</p>
      )}
    </>
  );
}
