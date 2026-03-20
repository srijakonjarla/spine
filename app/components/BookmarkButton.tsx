interface TabButtonProps {
  bookmarked: boolean;
  onToggle: () => void;
  size?: "xs" | "sm";
}

export function BookmarkButton({ bookmarked, onToggle, size = "xs" }: TabButtonProps) {
  return (
    <button
      onClick={onToggle}
      title={bookmarked ? "remove tab" : "tab this"}
      className={`text-${size} transition-colors ${bookmarked ? "text-stone-600" : "text-stone-300 hover:text-stone-500"}`}
    >
      {bookmarked ? "⌖ tabbed" : "⌖ tab"}
    </button>
  );
}
