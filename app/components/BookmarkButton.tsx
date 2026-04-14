import { BookmarkSimpleIcon } from "@phosphor-icons/react";

interface BookmarkButtonProps {
  bookmarked: boolean;
  onToggle: () => void;
}

export function BookmarkButton({ bookmarked, onToggle }: BookmarkButtonProps) {
  return (
    <button
      onClick={onToggle}
      title={bookmarked ? "remove bookmark" : "bookmark"}
      className={`transition-colors ${bookmarked ? "text-[var(--fg-heading)]" : "text-[var(--fg-faint)] hover:text-[var(--fg-muted)]"}`}
    >
      <BookmarkSimpleIcon size={18} weight={bookmarked ? "fill" : "regular"} />
    </button>
  );
}
