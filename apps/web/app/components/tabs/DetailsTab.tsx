import { useState } from "react";
import { StarDisplay } from "@/components/StarDisplay";
import { formatReadRange } from "@/lib/dates";
import { useBook } from "@/providers/BookContext";

const FORMATS = [
  "",
  "hardcover",
  "paperback",
  "trade paperback",
  "ebook",
  "audiobook",
  "large print",
];

function TagInput({
  tags,
  placeholder,
  onAdd,
  onRemove,
}: {
  tags: string[];
  placeholder: string;
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}) {
  const [input, setInput] = useState("");

  const commit = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) onAdd(val);
    setInput("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-full bg-hover text-fg"
          >
            {t}
            <button
              onClick={() => onRemove(t)}
              className="text-fg-faint hover:text-fg leading-none"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") setInput("");
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="underline-input text-sm"
      />
    </div>
  );
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Tab: Details ─────────────────────────────────────────────────

export default function DetailsTab() {
  const { entry, onUpdate, onDeleteRead, onDelete } = useBook();
  return (
    <div className="px-4 sm:px-10 py-5 sm:py-7 pb-10 sm:pb-12 bg-cream">
      <div className="grid gap-5 sm:gap-7 md:grid-cols-[2fr_1fr]">
        {/* Left: edit fields */}
        <div className="space-y-5">
          <div className="book-surface p-7">
            <p className="book-card-heading text-body-md">Edit details</p>

            <label className="detail-field-label">Title</label>
            <input
              type="text"
              value={entry.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="underline-input font-serif text-body-md mb-4"
            />

            <label className="detail-field-label">Author</label>
            <input
              type="text"
              value={entry.author}
              onChange={(e) => onUpdate({ author: e.target.value })}
              className="underline-input text-sm mb-4"
            />

            {/* Publisher — auto-populated from Hardcover, shown read-only if set */}
            {entry.publisher && (
              <>
                <label className="detail-field-label">Publisher</label>
                <p className="text-sm text-fg-muted mb-4">{entry.publisher}</p>
              </>
            )}

            {/* Audio duration — auto-populated from Hardcover */}
            {entry.audioDurationMinutes != null && (
              <>
                <label className="detail-field-label">Audio duration</label>
                <p className="text-sm text-fg-muted mb-4">
                  {fmtHours(entry.audioDurationMinutes)}
                </p>
              </>
            )}
          </div>

          <div className="book-surface p-7">
            <p className="book-card-heading text-body-md">Format</p>
            <label className="detail-field-label">Edition type</label>
            <select
              value={entry.format}
              onChange={(e) => onUpdate({ format: e.target.value })}
              className="underline-input text-sm mb-2 bg-transparent cursor-pointer"
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f || "— select format —"}
                </option>
              ))}
            </select>
            <p className="text-caption text-fg-faint">
              Library checkouts and acquisition source are tracked via your
              lists.
            </p>
          </div>

          <div className="book-surface p-7">
            <p className="book-card-heading text-body-md">Diversity tags</p>

            {/* Catalog-sourced tags from Hardcover (read-only) */}
            {(() => {
              const catalogTags = (entry.diversityTags ?? []).filter(
                (t) => !(entry.userDiversityTags ?? []).includes(t),
              );
              return catalogTags.length > 0 ? (
                <div className="mb-3">
                  <p className="text-detail text-fg-faint mb-1.5 uppercase tracking-wide">
                    from hardcover
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {catalogTags.map((t) => (
                      <span
                        key={t}
                        className="text-caption px-2 py-0.5 rounded-full bg-hover text-fg-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            <p className="text-caption text-fg-faint mb-2">
              Add your own — author identity, own voices, translated, etc.
            </p>
            <TagInput
              tags={entry.userDiversityTags ?? []}
              placeholder="e.g. own voices, translated…"
              onAdd={(t) => {
                const existing = entry.userDiversityTags ?? [];
                onUpdate({
                  diversityTags: [
                    ...new Set([...(entry.diversityTags ?? []), t]),
                  ],
                  userDiversityTags: [...existing, t],
                });
              }}
              onRemove={(t) => {
                const existing = entry.userDiversityTags ?? [];
                onUpdate({
                  diversityTags: (entry.diversityTags ?? []).filter(
                    (x) => x !== t,
                  ),
                  userDiversityTags: existing.filter((x) => x !== t),
                });
              }}
            />
          </div>
        </div>

        {/* Right: read history + delete */}
        <div>
          {entry.reads.length > 0 && (
            <div className="book-surface p-5 mb-3.5">
              <p className="book-card-heading text-body-md">Read history</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {formatReadRange(entry)}
                  </span>
                  <span className="text-xs text-stone-300">·</span>
                  <span className="text-xs text-stone-400 capitalize">
                    {entry.status.replace(/-/g, " ")}
                  </span>
                  {entry.rating > 0 && (
                    <StarDisplay rating={entry.rating} size={11} />
                  )}
                  {entry.status === "reading" && (
                    <span className="text-xs text-amber-700">← current</span>
                  )}
                </div>
                {[...entry.reads].reverse().map((read) => (
                  <div
                    key={read.id}
                    className="group flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">
                          {formatReadRange(read)}
                        </span>
                        <span className="text-xs text-stone-300">·</span>
                        <span className="text-xs text-stone-400 capitalize">
                          {read.status.replace(/-/g, " ")}
                        </span>
                        {read.rating > 0 && (
                          <StarDisplay rating={read.rating} size={11} />
                        )}
                      </div>
                      {read.feeling && (
                        <p className="text-xs text-stone-400 italic mt-0.5">
                          {read.feeling}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteRead(read.id)}
                      className="btn-delete opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="book-surface p-5">
            <p className="text-caption text-fg-faint font-sans mb-3">
              Updated{" "}
              {new Date(entry.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <button onClick={onDelete} className="btn-delete">
              delete entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
