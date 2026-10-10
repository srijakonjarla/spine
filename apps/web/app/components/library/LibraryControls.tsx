"use client";

import { useState } from "react";
import {
  activeFilterCount,
  LIBRARY_SORT_OPTIONS,
  RATING_FILTER_OPTIONS,
  type LibraryFilterOptions,
  type LibraryFilterState,
  type LibrarySort,
  type RatingFilter,
} from "@spine/shared";
import { MoodChip, AllMoodsChip } from "@/components/MoodChip";

const SELECT_CLASS =
  "text-xs bg-transparent border-none outline-none cursor-pointer transition-colors";

function FilterSelect<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (!raw) return onChange(null);
        onChange(options.find((o) => String(o.value) === raw)?.value ?? null);
      }}
      className={`${SELECT_CLASS} ${value != null ? "text-terra font-medium" : "text-fg-faint hover:text-fg-muted"}`}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

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
        <select
          id={`${id}-sort`}
          aria-label="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as LibrarySort)}
          className={`${SELECT_CLASS} text-fg-faint hover:text-fg-muted`}
        >
          {LIBRARY_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div
          id={`${id}-filters`}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 py-2 px-3 rounded-lg bg-surface border border-line"
        >
          <FilterSelect<RatingFilter>
            id={`${id}-rating`}
            label="any rating"
            value={filters.rating}
            options={RATING_FILTER_OPTIONS}
            onChange={(v) => set("rating", v)}
          />
          <FilterSelect
            id={`${id}-genre`}
            label="all genres"
            value={filters.genre}
            options={asOptions(options.genres)}
            onChange={(v) => set("genre", v)}
          />
          <FilterSelect
            id={`${id}-format`}
            label="any format"
            value={filters.format}
            options={asOptions(options.formats)}
            onChange={(v) => set("format", v)}
          />
          <FilterSelect
            id={`${id}-year`}
            label="any year finished"
            value={filters.year}
            options={asOptions(options.years)}
            onChange={(v) => set("year", v)}
          />
          <FilterSelect
            id={`${id}-bookshelf`}
            label="all bookshelves"
            value={filters.bookshelf}
            options={asOptions(options.bookshelves)}
            onChange={(v) => set("bookshelf", v)}
          />
          {count > 0 && (
            <button
              type="button"
              onClick={() =>
                setFilters({
                  ...filters,
                  genre: null,
                  rating: null,
                  format: null,
                  year: null,
                  bookshelf: null,
                })
              }
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
