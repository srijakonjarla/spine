"use client";

import { useRef, useState } from "react";
import { StarDisplay } from "./StarDisplay";

interface StarRatingProps {
  rating: number;
  onChange: (r: number) => void;
  /** Extra className on the wrapper (e.g. for custom --star-* color overrides) */
  className?: string;
}

export function StarRating({ rating, onChange, className = "" }: StarRatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const getRating = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = e.clientX - rect.left;
    return Math.max(0.25, Math.min(5, Math.round((x / rect.width) * 5 * 4) / 4));
  };

  return (
    <div
      ref={containerRef}
      className={`inline-flex cursor-pointer ${className}`}
      onMouseMove={(e) => setHover(getRating(e))}
      onMouseLeave={() => setHover(null)}
      onClick={(e) => {
        const r = getRating(e);
        if (r !== null) onChange(rating === r ? 0 : r);
      }}
    >
      <StarDisplay rating={hover ?? rating} />
    </div>
  );
}
