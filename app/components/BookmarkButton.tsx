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
      className={`transition-colors ${bookmarked ? "text-fg-heading" : "text-fg-faint hover:text-fg-muted"}`}
    >
      <BookmarkSimpleIcon size={18} weight={bookmarked ? "fill" : "regular"} />
    </button>
  );
}
