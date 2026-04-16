import { StarDisplay } from "@/components/StarDisplay";
import { formatReadRange } from "@/lib/dates";
import { BookEntry } from "@/types";

// ─── Tab: Details ─────────────────────────────────────────────────

export default function DetailsTab({
  entry,
  onUpdate,
  onDeleteRead,
  onDelete,
}: {
  entry: BookEntry;
  onUpdate: (patch: Partial<BookEntry>) => void;
  onDeleteRead: (id: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="px-10 py-7 pb-12 bg-cream">
      <div className="grid gap-7" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Left: edit fields */}
        <div className="book-surface p-7">
          <p className="book-card-heading text-[15px]">Edit details</p>

          <label className="detail-field-label">Title</label>
          <input
            type="text"
            value={entry.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="underline-input font-serif text-[15px] mb-4"
          />

          <label className="detail-field-label">Author</label>
          <input
            type="text"
            value={entry.author}
            onChange={(e) => onUpdate({ author: e.target.value })}
            className="underline-input text-sm mb-4"
          />
        </div>

        {/* Right: read history + delete */}
        <div>
          {entry.reads.length > 0 && (
            <div className="book-surface p-5 mb-3.5">
              <p className="book-card-heading text-[15px]">Read history</p>
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
            <p className="text-[11px] text-fg-faint font-sans mb-3">
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
