"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseGoodreadsCSV, type GoodreadsPreview } from "../lib/goodreads";
import { createEntry, getBookByCatalogId, addImportedRead } from "../lib/db";
import { findOrCreateCatalogEntry } from "../lib/catalog";
import { hasImportedGoodreads, markGoodreadsImported } from "../lib/auth";

type ImportState = "idle" | "preview" | "importing" | "done";

const statusLabel: Record<string, string> = {
  "reading": "reading",
  "finished": "finished",
  "want-to-read": "want to read",
  "did-not-finish": "did not finish",
};

export default function ImportPage() {
  const [state, setState] = useState<ImportState>("idle");
  const [previews, setPreviews] = useState<GoodreadsPreview[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [alreadyImported, setAlreadyImported] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    hasImportedGoodreads().then(setAlreadyImported);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseGoodreadsCSV(text);
        if (!parsed.length) {
          setError("No books found. Make sure this is a Goodreads export CSV.");
          return;
        }
        setPreviews(parsed);
        setState("preview");
      } catch {
        setError("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setState("importing");
    setProgress(0);
    let done = 0;
    for (const { entry } of previews) {
      try {
        const catalogEntry = await findOrCreateCatalogEntry(entry.title, entry.author, undefined, entry.genres);
        const existing = await getBookByCatalogId(catalogEntry.id);

        if (!existing) {
          // Brand new book — create it
          await createEntry(entry, catalogEntry.id);
        } else if (
          existing.status === "want-to-read" &&
          (entry.status === "finished" || entry.status === "reading" || entry.status === "did-not-finish")
        ) {
          // Upgrade: was want-to-read, now has actual read data — not a re-read, just an update
          // (already handled by the current books row; skip to avoid overwriting active state)
        } else if (
          (entry.status === "finished" || entry.status === "did-not-finish") &&
          entry.dateFinished !== existing.dateFinished
        ) {
          // Different finish date = a separate read — log it as a past read
          const alreadyLogged = existing.reads.some(
            (r) => r.dateFinished === entry.dateFinished && r.status === entry.status
          );
          if (!alreadyLogged) {
            await addImportedRead(existing.id, entry);
          }
        }
        // Otherwise same state — skip
      } catch {
        // skip errors silently
      }
      done++;
      setProgress(done);
    }
    await markGoodreadsImported();
    setState("done");
  };

  const finishedCount = previews.filter((p) => p.entry.status === "finished").length;
  const readingCount = previews.filter((p) => p.entry.status === "reading").length;
  const wantCount = previews.filter((p) => p.entry.status === "want-to-read").length;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/" className="back-link">
            ← index
          </Link>
        </div>

        <h1 className="page-title mb-1">import from goodreads</h1>
        <p className="text-xs text-stone-400 mb-8">
          export your library from goodreads (My Books → Export Library) and upload the CSV here.
        </p>

        {alreadyImported === false && state === "idle" && (
          <div>
            <input
              ref={fileRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="border border-stone-300 rounded-lg px-4 py-3 text-sm text-stone-600 hover:border-stone-500 hover:text-stone-800 transition-colors"
            >
              choose csv file
            </button>
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </div>
        )}

        {alreadyImported === false && state === "preview" && (
          <div>
            <div className="mb-6 p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
              <p className="text-xs text-stone-500">
                <span className="text-stone-800 font-semibold">{previews.length}</span> books found
              </p>
              <p className="text-xs text-stone-400">· {finishedCount} finished</p>
              <p className="text-xs text-stone-400">· {readingCount} currently reading</p>
              <p className="text-xs text-stone-400">· {wantCount} want to read</p>
            </div>

            {/* preview list */}
            <div className="space-y-0.5 mb-8 max-h-80 overflow-y-auto">
              {previews.map(({ entry }) => (
                <div key={entry.id} className="flex items-baseline gap-3 py-1">
                  <span className="text-xs text-stone-300">·</span>
                  <span className="text-sm text-stone-700 truncate flex-1">{entry.title}</span>
                  <span className="text-xs text-stone-400 shrink-0">{entry.author}</span>
                  <span className="text-xs text-stone-300 shrink-0">{statusLabel[entry.status]}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                className="btn-primary"
              >
                import all
              </button>
              <button
                onClick={() => { setState("idle"); setPreviews([]); if (fileRef.current) fileRef.current.value = ""; }}
                className="text-sm text-stone-400 hover:text-stone-700 transition-colors px-4 py-2"
              >
                cancel
              </button>
            </div>
          </div>
        )}

        {alreadyImported === false && state === "importing" && (
          <div>
            <p className="text-sm text-stone-600 mb-3">
              importing {progress} / {previews.length}...
            </p>
            <div className="w-full bg-stone-100 rounded-full h-1">
              <div
                className="bg-stone-700 h-1 rounded-full transition-all"
                style={{ width: `${(progress / previews.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {state === "done" && alreadyImported === false && (
          <div>
            <p className="text-sm text-stone-700 mb-4">
              ✓ imported {previews.length} books
            </p>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              go to index →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
