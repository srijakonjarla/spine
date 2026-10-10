"use client";

import { useState } from "react";
import {
  activeFilterCount,
  clearDropdownFilters,
  LIBRARY_SORT_OPTIONS,
  type LibraryFilterOptions,
  type LibraryFilterState,
  type LibrarySort,
} from "@spine/shared";
import { MoodChip, AllMoodsChip } from "@/components/MoodChip";
import { RatingFilter } from "@/components/library/RatingFilter";
import { MultiSelectMenu, SelectMenu } from "@/components/library/FilterMenu";

const asOptions = <T extends string | number>(vs: T[]) =>
  vs.map((v) => ({ value: v, label: String(v) }));

export function LibraryControls({
  id,
  filters,
  setFilters,
  sort,
  setSort,
  options,
  disabled,
}: {
  id: string;
  filters: LibraryFilterState;
  setFilters: (f: LibraryFilterState) => void;
  sort: LibrarySort;
  setSort: (s: LibrarySort) => void;
  options: LibraryFilterOptions;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);
  const set = <K extends keyof LibraryFilterState>(
    key: K,
    value: LibraryFilterState[K],
  ) => setFilters({ ...filters, [key]: value });

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <input
          id={`${id}-search`}
          type="text"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="search by title or author..."
          className="flex-1 underline-input"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${id}-filters`}
          className={`text-xs transition-colors ${count > 0 ? "text-terra font-medium" : "text-fg-faint hover:text-fg-muted"}`}
        >
          filters{count > 0 ? ` · ${count}` : ""} {open ? "▾" : "▸"}
        </button>
        <SelectMenu
          id={`${id}-sort`}
          menuLabel="sort"
          placeholder="sort"
          value={sort}
          options={LIBRARY_SORT_OPTIONS}
          onChange={(v) => v && setSort(v)}
          align="right"
          clearable={false}
        />
      </div>

      {open && (
        <div
          id={`${id}-filters`}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 py-2 px-3 rounded-lg bg-surface border border-line"
        >
          <RatingFilter
            id={id}
            value={filters.ratings}
            counts={options.ratingCounts}
            onChange={(v) => set("ratings", v)}
          />
          <MultiSelectMenu
            id={`${id}-genre`}
            menuLabel="filter by genre"
            placeholder="all genres"
            value={filters.genres}
            options={asOptions(options.genres)}
            onChange={(v) => set("genres", v)}
            searchable
          />
          <MultiSelectMenu
            id={`${id}-format`}
            menuLabel="filter by format"
            placeholder="any format"
            value={filters.formats}
            options={asOptions(options.formats)}
            onChange={(v) => set("formats", v)}
          />
          <MultiSelectMenu
            id={`${id}-year`}
            menuLabel="filter by year finished"
            placeholder="any year finished"
            value={filters.years}
            options={asOptions(options.years)}
            onChange={(v) => set("years", v)}
          />
          <MultiSelectMenu
            id={`${id}-bookshelf`}
            menuLabel="filter by bookshelf"
            placeholder="all bookshelves"
            value={filters.bookshelves}
            options={asOptions(options.bookshelves)}
            onChange={(v) => set("bookshelves", v)}
          />
          {count > 0 && (
            <button
              type="button"
              onClick={() => setFilters(clearDropdownFilters(filters))}
              className="text-xs text-terra hover:underline ml-auto"
            >
              clear
            </button>
          )}
        </div>
      )}

      {options.moods.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AllMoodsChip
            active={!filters.mood}
            onClick={() => set("mood", null)}
          />
          {options.moods.map((mood) => (
            <MoodChip
              key={mood}
              mood={mood}
              active={filters.mood === mood}
              onClick={() => set("mood", filters.mood === mood ? null : mood)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
