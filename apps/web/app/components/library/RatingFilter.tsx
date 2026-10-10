"use client";

import { StarIcon } from "@phosphor-icons/react";
import { RATING_BUCKETS, type RatingBucket } from "@spine/shared";
import { StarDisplay } from "@/components/StarDisplay";
import { FilterMenu, MenuItem } from "@/components/library/FilterMenu";

/** Multi-select star-rating filter with a count per star level. */
export function RatingFilter({
  id,
  value,
  counts,
  onChange,
}: {
  id: string;
  value: RatingBucket[];
  counts: Record<RatingBucket, number>;
  onChange: (v: RatingBucket[]) => void;
}) {
  const toggle = (b: RatingBucket) =>
    onChange(
      value.includes(b)
        ? value.filter((v) => v !== b)
        : RATING_BUCKETS.filter((r) => r === b || value.includes(r)),
    );

  const stars = value.filter((b) => b > 0);
  const label =
    value.length > 0
      ? [
          ...(stars.length > 0 ? [stars.join(", ")] : []),
          ...(value.includes(0) ? ["unrated"] : []),
        ].join(" + ")
      : "any rating";

  return (
    <FilterMenu
      id={`${id}-rating`}
      menuLabel="filter by rating"
      label={label}
      active={value.length > 0}
      icon={
        stars.length > 0 && (
          <StarIcon
            weight="fill"
            size={12}
            className="text-[var(--star-filled)]"
          />
        )
      }
    >
      {() => (
        <>
          {RATING_BUCKETS.map((b) => (
            <MenuItem
              key={b}
              multi
              checked={value.includes(b)}
              dimmed={counts[b] === 0}
              ariaLabel={b === 0 ? "unrated" : `${b} stars`}
              onSelect={() => toggle(b)}
              trailing={
                <span className="text-caption text-fg-faint tabular-nums">
                  {counts[b]}
                </span>
              }
            >
              {b === 0 ? "unrated" : <StarDisplay rating={b} size={13} />}
            </MenuItem>
          ))}
          {value.length > 0 && (
            <div className="mt-1 pt-1 border-t border-line">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full px-2 py-1 text-left text-xs text-terra hover:underline"
              >
                clear rating
              </button>
            </div>
          )}
        </>
      )}
    </FilterMenu>
  );
}
