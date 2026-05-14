"use client";

import { useMemo, useState } from "react";
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
  const [stage, setStage] = useState<"upgraded" | "original" | "failed">(
    "upgraded",
  );
  const upgraded = upgradeCoverUrl(coverUrl);
  const showImage = coverUrl && stage !== "failed";
  const src = stage === "original" ? coverUrl! : upgraded;

  if (showImage) {
    return (
      <Image
        src={src}
        alt={title}
        width={256}
        height={384}
        sizes="(max-width: 640px) 33vw, 200px"
        onError={() =>
          setStage((s) =>
            s === "upgraded" && upgraded !== coverUrl ? "original" : "failed",
          )
        }
        className={`${className} rounded shadow-sm shrink-0 self-start object-cover aspect-2/3`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded shadow-sm shrink-0 self-start aspect-2/3 flex flex-col justify-end p-1.5`}
      style={{ backgroundColor: color }}
    >
      <p className="text-label font-semibold leading-tight line-clamp-3 text-white/80 wrap-break-word">
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
  const [stage, setStage] = useState<"upgraded" | "original" | "failed">(
    "upgraded",
  );
  const upgraded = upgradeCoverUrl(coverUrl);
  const showImage = coverUrl && stage !== "failed";
  const src = stage === "original" ? coverUrl! : upgraded;

  if (showImage) {
    const intrinsic = size === "lg" ? { w: 256, h: 384 } : { w: 96, h: 144 };
    const sizesAttr = size === "lg" ? "(max-width: 640px) 50vw, 250px" : "96px";
    return (
      <Image
        src={src}
        alt={title}
        width={intrinsic.w}
        height={intrinsic.h}
        sizes={sizesAttr}
        onError={() =>
          setStage((s) =>
            s === "upgraded" && upgraded !== coverUrl ? "original" : "failed",
          )
        }
        className={`${width} ${height} object-cover rounded-sm shrink-0 shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${width} ${height} rounded-sm shrink-0 flex flex-col justify-end p-1.5`}
      style={{ backgroundColor: color }}
    >
      <p className="text-micro-plus font-semibold leading-tight line-clamp-3 text-white/80 wrap-break-word">
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
