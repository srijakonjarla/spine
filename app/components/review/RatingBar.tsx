interface RatingBarProps {
  stars: number;
  count: number;
  max: number;
}

/** Single row of the star-rating histogram (used internally by RatingsAndFormats). */
export function RatingBar({ stars, count, max }: RatingBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-fg-faint w-5 text-right shrink-0">
        {stars}★
      </span>
      <div className="flex-1 h-4 rounded bg-edge overflow-hidden">
        <div
          style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%" }}
          className="h-full rounded bg-gold transition-all duration-500"
        />
      </div>
      <span className="text-caption text-fg-faint w-4 shrink-0">
        {count}
      </span>
    </div>
  );
}
