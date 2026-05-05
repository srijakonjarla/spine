/**
 * Skeleton primitives — grey blocks with a shared `animate-pulse` and
 * `bg-hover` tone. Compose into per-page skeletons that mirror the real
 * layout instead of writing one-off pulse blocks per page.
 *
 * Use a single `animate-pulse` wrapper at the page level (not on each
 * primitive) so all blocks pulse in sync.
 */

import { ReactNode } from "react";

interface BaseProps {
  className?: string;
}

/** Wrap your skeleton tree once at the top so blocks pulse in sync. */
export function SkeletonRoot({
  children,
  className = "",
}: BaseProps & { children: ReactNode }) {
  return <div className={`animate-pulse ${className}`}>{children}</div>;
}

/** Single text-line block. Pass width via className (e.g. `w-32`, `w-full`). */
export function SkeletonLine({
  className = "",
  size = "sm",
}: BaseProps & { size?: "xs" | "sm" | "md" | "lg" }) {
  const h =
    size === "xs"
      ? "h-2.5"
      : size === "sm"
        ? "h-3.5"
        : size === "md"
          ? "h-5"
          : "h-7";
  return <div className={`${h} bg-hover rounded ${className}`} />;
}

/** Generic rounded block — pass dimensions via className. */
export function SkeletonBlock({ className = "" }: BaseProps) {
  return <div className={`bg-hover rounded-xl ${className}`} />;
}

/** Book-cover-shaped block (2:3 aspect). */
export function SkeletonCover({ className = "" }: BaseProps) {
  return <div className={`aspect-[2/3] bg-hover rounded ${className}`} />;
}

/** Grid of cover-shaped placeholders for library/finished views. */
export function SkeletonGrid({
  count = 12,
  className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <SkeletonCover className="mb-2" />
          <SkeletonLine className="w-4/5 mb-1" size="xs" />
          <SkeletonLine className="w-1/2" size="xs" />
        </div>
      ))}
    </div>
  );
}
