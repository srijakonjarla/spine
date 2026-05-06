"use client";

import Link from "next/link";

const FEELING_TRUNCATE = 120;

export function PanelSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-label uppercase tracking-spread font-semibold mb-3 text-fg-faint">
        {label}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function BookLink({
  id,
  title,
  author,
  rating,
  feeling,
  meta,
  onClose,
}: {
  id: string;
  title: string;
  author?: string;
  rating?: number;
  feeling?: string;
  meta?: string;
  onClose: () => void;
}) {
  const trimmedFeeling = feeling?.trim();
  const isTruncated =
    trimmedFeeling && trimmedFeeling.length > FEELING_TRUNCATE;
  const feelingSnippet = isTruncated
    ? trimmedFeeling.slice(0, FEELING_TRUNCATE).trimEnd() + "..."
    : trimmedFeeling;
  return (
    <div>
      <Link href={`/book/${id}`} className="block group" onClick={onClose}>
        <p className="text-note font-medium truncate text-fg group-hover:opacity-70 transition-opacity">
          {title}
        </p>
        {author && (
          <p className="text-caption mt-0.5 truncate text-fg-muted">{author}</p>
        )}
        {rating != null && rating > 0 && (
          <p className="text-detail mt-0.5 text-gold">
            {"★".repeat(Math.round(rating))}
          </p>
        )}
        {meta && <p className="text-detail mt-0.5 text-fg-faint">{meta}</p>}
      </Link>
      {feelingSnippet && (
        <p className="text-xs mt-1.5 leading-relaxed text-fg-muted font-serif italic">
          &ldquo;{feelingSnippet}&rdquo;
          {isTruncated && (
            <Link
              href={`/book/${id}#reflection`}
              className="not-italic ml-1.5 text-detail text-fg-faint hover:opacity-70 transition-opacity"
              onClick={onClose}
            >
              read more →
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
