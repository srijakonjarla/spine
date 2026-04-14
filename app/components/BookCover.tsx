import { useMemo } from "react";

const SPINE_COLORS = [
  "var(--spine-1)", "var(--spine-2)", "var(--spine-3)", "var(--spine-4)", "var(--spine-5)",
  "var(--spine-6)", "var(--spine-7)", "var(--spine-8)", "var(--spine-9)", "var(--spine-10)",
];

function hashTitle(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface BookCoverProps {
  coverUrl?: string;
  title: string;
  author?: string;
  /** Tailwind width class, e.g. "w-16". Applied to the img; placeholder matches. */
  className?: string;
}

export function BookCover({ coverUrl, title, author, className = "w-16" }: BookCoverProps) {
  const spineColor = useMemo(
    () => SPINE_COLORS[hashTitle(title || " ") % SPINE_COLORS.length],
    [title]
  );

  if (coverUrl) {
    return (
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
      style={{ backgroundColor: spineColor }}
    >
      <p className="text-[9px] font-semibold leading-tight line-clamp-3 text-white/80 break-words">
        {title}
      </p>
      {author && (
        <p className="text-[8px] mt-0.5 leading-tight truncate text-white/50">{author}</p>
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
  const spineColor = useMemo(
    () => SPINE_COLORS[hashTitle(title || " ") % SPINE_COLORS.length],
    [title]
  );

  if (coverUrl) {
    return (
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
      style={{ backgroundColor: spineColor }}
    >
      <p className="text-[8px] font-semibold leading-tight line-clamp-3 text-white/80 break-words">
        {title}
      </p>
      {author && (
        <p className="text-[7px] mt-0.5 leading-tight truncate text-white/50">{author}</p>
      )}
    </div>
  );
}
