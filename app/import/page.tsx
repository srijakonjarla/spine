"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseGoodreadsCSV, type GoodreadsPreview } from "@/lib/goodreads";
import { hasImportedGoodreads } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type ImportState = "idle" | "preview" | "importing" | "done" | "error";

const statusLabel: Record<string, string> = {
  "reading": "reading",
  "finished": "finished",
  "want-to-read": "want to read",
  "did-not-finish": "did not finish",
};

export default function ImportPage() {
  const [state, setState] = useState<ImportState>("idle");
  const [previews, setPreviews] = useState<GoodreadsPreview[]>([]);
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

    const entries = previews.map(({ entry }) => ({
      title: entry.title,
      author: entry.author,
      genres: entry.genres,
      status: entry.status,
      dateStarted: entry.dateStarted,
      dateFinished: entry.dateFinished,
      dateShelved: entry.dateShelved,
      rating: entry.rating,
      feeling: entry.feeling,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setState("error"); setError("not signed in"); return; }

    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/import-goodreads`;

    // fire and forget — keepalive lets it finish even if user navigates away
    fetch(fnUrl, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ entries }),
    }).catch(() => {/* silent — background */});

    setState("done");
  };

  const finishedCount = previews.filter((p) => p.entry.status === "finished").length;
  const dnfCount = previews.filter((p) => p.entry.status === "did-not-finish").length;
  const readingCount = previews.filter((p) => p.entry.status === "reading").length;
  const wantCount = previews.filter((p) => p.entry.status === "want-to-read").length;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/" className="back-link">← journals</Link>
        </div>

        <h1 className="page-title mb-1">import from goodreads</h1>
        <p className="text-xs text-stone-400 mb-8">
          export your library from goodreads (my books → export library) and upload the csv here.
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
              {dnfCount > 0 && <p className="text-xs text-stone-400">· {dnfCount} did not finish</p>}
              <p className="text-xs text-stone-400">· {readingCount} currently reading</p>
              <p className="text-xs text-stone-400">· {wantCount} want to read</p>
            </div>

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
              <button onClick={handleImport} className="btn-primary">
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

        {state === "importing" && (
          <p className="text-sm text-stone-500">starting import...</p>
        )}

        {state === "done" && (
          <div className="space-y-3">
            <p className="text-sm text-stone-700">
              import started — {previews.length} books are being imported in the background.
            </p>
            <p className="text-xs text-stone-400">you can navigate away. books will appear shortly.</p>
            <button
              onClick={() => router.push("/")}
              className="back-link block"
            >
              go to journals →
            </button>
          </div>
        )}

        {state === "error" && (
          <p className="text-xs text-red-400">{error || "something went wrong"}</p>
        )}
      </div>
    </div>
  );
}
