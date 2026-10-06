"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchCoverEditions, type CoverEdition } from "@/lib/catalog";
import type { BookEntry } from "@/types";

interface CoverPickerModalProps {
  entry: BookEntry;
  onClose: () => void;
  onSelect: (coverUrl: string) => void;
}

export function CoverPickerModal({
  entry,
  onClose,
  onSelect,
}: CoverPickerModalProps) {
  const [editions, setEditions] = useState<CoverEdition[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCoverEditions({
      isbn: entry.isbn,
      title: entry.title,
      author: entry.author,
    }).then((result) => {
      if (!cancelled) setEditions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [entry.isbn, entry.title, entry.author]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-100 rounded-2xl p-6 shadow-2xl bg-surface border border-line max-h-[80vh] overflow-y-auto">
        <h3 className="font-serif text-lg font-bold text-fg-heading mb-1">
          Change cover
        </h3>
        <p className="font-hand text-note text-fg-muted mb-5">
          pick a different edition&apos;s cover
        </p>

        {editions === null && (
          <p className="text-note text-fg-faint py-6 text-center">
            looking for editions…
          </p>
        )}
        {editions !== null && editions.length === 0 && (
          <p className="text-note text-fg-faint py-6 text-center">
            no other editions found.
          </p>
        )}
        {editions !== null && editions.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {editions.map((ed) => (
              <button
                key={ed.id || ed.coverUrl}
                onClick={() => onSelect(ed.coverUrl)}
                title={ed.publisher || undefined}
                className={`relative rounded-md overflow-hidden aspect-2/3 shadow-sm transition-transform hover:-translate-y-0.5 ${
                  ed.coverUrl === entry.coverUrl ? "ring-2 ring-plum" : ""
                }`}
              >
                <Image
                  src={ed.coverUrl}
                  alt={ed.publisher || entry.title}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-note px-4 py-2 rounded-full text-fg-muted hover:bg-hover transition-colors"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
