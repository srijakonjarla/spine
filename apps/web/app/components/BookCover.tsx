import { useMemo } from "react";
import Image from "next/image";
import { spineColor } from "@/lib/spineUtils";
import { upgradeCoverUrl } from "@/lib/coverUrl";

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
      <Image
        src={upgradeCoverUrl(coverUrl)}
        alt={title}
        width={256}
        height={384}
        sizes="(max-width: 640px) 33vw, 200px"
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
  size = "sm",
}: {
  coverUrl?: string;
  title: string;
  author?: string;
  width?: string;
  height?: string;
  /** "sm" for inline/list thumbnails (~24-48px), "lg" for grid cells (~200-300px). */
  size?: "sm" | "lg";
}) {
  const color = useMemo(() => spineColor(title), [title]);

  if (coverUrl) {
    const intrinsic = size === "lg" ? { w: 256, h: 384 } : { w: 96, h: 144 };
    const sizesAttr = size === "lg" ? "(max-width: 640px) 50vw, 250px" : "96px";
    return (
      <Image
        src={upgradeCoverUrl(coverUrl)}
        alt={title}
        width={intrinsic.w}
        height={intrinsic.h}
        sizes={sizesAttr}
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
