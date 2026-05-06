"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { parseGoodreadsCSV, type GoodreadsPreview } from "@/lib/goodreads";
import { STATUS_LABEL } from "@/lib/statusMeta";

type State = "idle" | "preview" | "running" | "done" | "error";

export function GoodreadsImport() {
  const [state, setState] = useState<State>("idle");
  const [csvText, setCsvText] = useState("");
  const [previews, setPreviews] = useState<GoodreadsPreview[]>([]);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [alreadyImported, setAlreadyImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch("/api/admin/import-goodreads");
        const data = await res.json();
        setProgress({ processed: data.processed ?? 0, total: data.total ?? 0 });
        if (data.status === "done") {
          stopPolling();
          setState("done");
          setAlreadyImported(true);
        }
      } catch {
        /* ignore */
      }
    }, 10_000);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      const imp = meta?.goodreads_import;
      if (imp?.status === "running") {
        setState("running");
        setProgress({ processed: imp.processed ?? 0, total: imp.total ?? 0 });
        startPolling();
      } else if (meta?.goodreads_imported === true) {
        setAlreadyImported(true);
      }
    });
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setCsvText(text);
        setPreviews(parsed);
        setState("preview");
      } catch {
        setError("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    try {
      setState("running");
      const res = await apiFetch("/api/admin/import-goodreads", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
      });
      const { total } = await res.json();
      setProgress({ processed: 0, total });
      startPolling();
    } catch (err) {
      setError(String(err));
      setState("error");
    }
  };

  const reset = () => {
    stopPolling();
    setState("idle");
    setPreviews([]);
    setCsvText("");
    setError("");
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (state === "running") {
    const pct = progress?.total
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;
    return (
      <div className="space-y-3 max-w-sm">
        <p className="text-xs text-fg-muted animate-pulse">
          importing in the background — you can navigate away
        </p>
        {progress && (
          <>
            <p className="text-xs text-fg-faint">
              {progress.processed} / {progress.total} books · {pct}%
            </p>
            <div className="w-full h-0.5 bg-line rounded-full overflow-hidden">
              <div
                style={{ width: `${pct}%` }}
                className="h-full bg-sage transition-all duration-500"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-sage">
          {progress?.total ?? previews.length} books imported.
        </p>
        <button
          onClick={reset}
          className="text-xs text-fg-faint hover:text-fg-muted transition-colors"
        >
          import again
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-400">
          {error || "Something went wrong."}
        </p>
        <button
          onClick={reset}
          className="text-xs text-fg-faint hover:text-fg-muted transition-colors"
        >
          try again
        </button>
      </div>
    );
  }

  if (state === "preview") {
    const finishedCount = previews.filter(
      (p) => p.entry.status === "finished",
    ).length;
    const dnfCount = previews.filter(
      (p) => p.entry.status === "did-not-finish",
    ).length;
    const readingCount = previews.filter(
      (p) => p.entry.status === "reading",
    ).length;
    const wantCount = previews.filter(
      (p) => p.entry.status === "want-to-read",
    ).length;
    return (
      <div className="max-w-sm">
        <div className="mb-4 p-4 bg-surface border border-line rounded-lg space-y-1">
          <p className="text-xs text-fg-muted">
            <span className="font-semibold text-fg-heading">
              {previews.length}
            </span>{" "}
            books found
          </p>
          <p className="text-xs text-fg-faint">· {finishedCount} finished</p>
          {dnfCount > 0 && (
            <p className="text-xs text-fg-faint">· {dnfCount} did not finish</p>
          )}
          <p className="text-xs text-fg-faint">
            · {readingCount} currently reading
          </p>
          <p className="text-xs text-fg-faint">· {wantCount} want to read</p>
        </div>
        <div className="space-y-0.5 mb-6 max-h-60 overflow-y-auto">
          {previews.map(({ entry }) => (
            <div key={entry.id} className="flex items-baseline gap-3 py-0.5">
              <span className="text-xs text-fg-faint">·</span>
              <span className="text-sm text-fg truncate flex-1">
                {entry.title}
              </span>
              <span className="text-xs text-fg-muted shrink-0">
                {entry.author}
              </span>
              <span className="text-xs text-fg-faint shrink-0">
                {STATUS_LABEL[entry.status]}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={handleImport} className="btn-primary">
            import all
          </button>
          <button
            onClick={reset}
            className="text-sm text-fg-faint hover:text-fg-muted transition-colors px-4 py-2"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-fg-faint mb-4">
        Export your library from Goodreads (My Books → Export Library) then
        upload the CSV. Runs in the background — you can navigate away once
        started.
        {alreadyImported && (
          <span className="text-fg-faint ml-2">· previously imported</span>
        )}
      </p>
      <input
        id="profile-goodreads-csv"
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="text-sm border border-line rounded-lg px-4 py-2.5 text-fg-muted hover:border-fg-muted hover:text-fg transition-colors"
      >
        choose CSV file
      </button>
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </div>
  );
}
