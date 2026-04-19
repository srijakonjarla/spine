import { useMemo } from "react";
import { spineColor } from "@/lib/spineUtils";

interface BookCoverProps {
  coverUrl?: string;
  title: string;
  author?: string;
  /** Tailwind width class, e.g. "w-16". Applied to the img; placeholder matches. */
  className?: string;
}

export function BookCover({
  coverUrl,
  title,
  author,
  className = "w-16",
}: BookCoverProps) {
  const color = useMemo(() => spineColor(title), [title]);

  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={title}
        className={`${className} rounded shadow-sm shrink-0 self-start object-cover aspect-[2/3]`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded shadow-sm shrink-0 self-start aspect-[2/3] flex flex-col justify-end p-1.5`}
      style={{ backgroundColor: color }}
    >
      <p className="text-label font-semibold leading-tight line-clamp-3 text-white/80 break-words">
        {title}
      </p>
      {author && (
        <p className="text-micro-plus mt-0.5 leading-tight truncate text-white/50">
          {author}
        </p>
      )}
    </div>
  );
}

/** Compact thumbnail variant for use in grids/lists (fixed pixel size). */
export function BookCoverThumb({
  coverUrl,
  title,
  author,
  width = "w-6",
  height = "h-9",
}: {
  coverUrl?: string;
  title: string;
  author?: string;
  width?: string;
  height?: string;
}) {
  const color = useMemo(() => spineColor(title), [title]);

  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={title}
        className={`${width} ${height} object-cover rounded-sm shrink-0 shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${width} ${height} rounded-sm shrink-0 flex flex-col justify-end p-1.5`}
      style={{ backgroundColor: color }}
    >
      <p className="text-micro-plus font-semibold leading-tight line-clamp-3 text-white/80 break-words">
        {title}
      </p>
      {author && (
        <p className="text-micro mt-0.5 leading-tight truncate text-white/50">
          {author}
        </p>
      )}
    </div>
  );
}
