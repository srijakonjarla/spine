"use client";

import type { BookEntry } from "@/types";

export function ReadSelector({
  reads,
  selectedReadId,
  onSelect,
}: {
  reads: BookEntry["reads"];
  selectedReadId: string | null;
  onSelect: (readId: string | null) => void;
}) {
  if (reads.length === 0) return null;
  return (
    <div className="bg-plum-trace border-b border-line px-4 sm:px-10 py-2.5 flex items-center gap-2 overflow-x-auto">
      <span className="text-detail text-fg-muted font-sans uppercase tracking-widest mr-1">
        Read
      </span>
      {reads.map((read, i) => (
        <button
          key={read.id}
          onClick={() => onSelect(read.id)}
          className={`text-caption font-sans px-3 py-1 rounded-full border transition-colors ${
            selectedReadId === read.id
              ? "bg-plum border-plum text-white"
              : "border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600"
          }`}
        >
          {i + 1}
          {(read.dateFinished || read.dateStarted) && (
            <span className="ml-1 opacity-70">
              · {new Date(read.dateFinished || read.dateStarted).getFullYear()}
            </span>
          )}
        </button>
      ))}
      <button
        onClick={() => onSelect(null)}
        className={`text-caption font-sans px-3 py-1 rounded-full border transition-colors ${
          selectedReadId === null
            ? "bg-plum border-plum text-white"
            : "border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600"
        }`}
      >
        Current
      </button>
    </div>
  );
}
