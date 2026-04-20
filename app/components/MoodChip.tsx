interface MoodChipProps {
  mood: string;
  active?: boolean;
  onClick?: () => void;
  /** Show as a plain display chip (no hover, no active state) */
  display?: boolean;
}

/** Filter / toggle chip for mood tags */
export function MoodChip({
  mood,
  active = false,
  onClick,
  display = false,
}: MoodChipProps) {
  const slug = mood.replace(/\s+/g, "-");

  if (display) {
    return (
      <span
        className={`text-detail px-2 py-0.5 rounded-full bg-hover text-fg-muted`}
      >
        {mood}
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`mood-filter-chip mood-${slug}${active ? " active" : ""}`}
    >
      {mood}
    </button>
  );
}

/** "All" reset chip — shown alongside MoodChip filters */
export function AllMoodsChip({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full transition-colors border border-line ${
        active ? "bg-plum text-white" : "bg-surface text-fg-muted"
      }`}
    >
      all
    </button>
  );
}
