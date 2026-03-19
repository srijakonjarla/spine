interface BookmarkButtonProps {
  bookmarked: boolean;
  onToggle: () => void;
  size?: "xs" | "sm";
}

export function BookmarkButton({ bookmarked, onToggle, size = "xs" }: BookmarkButtonProps) {
  return (
    <button
      onClick={onToggle}
      title={bookmarked ? "remove bookmark" : "bookmark"}
      className={`text-${size} transition-colors ${bookmarked ? "text-stone-600" : "text-stone-300 hover:text-stone-500"}`}
    >
      {bookmarked ? "⌖ bookmarked" : "⌖ bookmark"}
    </button>
  );
}
