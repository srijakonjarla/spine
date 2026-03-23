"use client";

import { useId } from "react";

function StarSvg({ fill, size = 14 }: { fill: number; size?: number }) {
  const id = useId();
  const pct = Math.round(Math.max(0, Math.min(1, fill)) * 100);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${pct}%`} stopColor="#78350f" />
          <stop offset={`${pct}%`} stopColor="#d6d3d1" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export function StarDisplay({ rating, size }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarSvg key={i} fill={rating - (i - 1)} size={size} />
      ))}
    </span>
  );
}
