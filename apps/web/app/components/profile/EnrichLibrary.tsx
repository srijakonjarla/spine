"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

export function EnrichLibrary() {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [total, setTotal] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkProgress = async () => {
    try {
      const res = await apiFetch("/api/admin/backfill");
      const { remaining: rem, running } = await res.json();
      setRemaining(rem);
      if (!running) {
        stopPolling();
        setState("done");
      }
    } catch {
      /* ignore transient errors */
    }
  };

  const start = async () => {
    try {
      setState("running");
      const res = await apiFetch("/api/admin/backfill", { method: "POST" });
      const { total: t } = await res.json();
      setTotal(t);
      if (t === 0) {
        setState("done");
        return;
      }
      pollRef.current = setInterval(checkProgress, 15_000);
    } catch {
      setState("error");
    }
  };

  useEffect(() => () => stopPolling(), []);

  return (
    <div>
      <p className="text-xs text-fg-faint mb-4">
        Fills in covers, page counts, ISBNs, and genres using Hardcover. Runs in
        the background — you can navigate away.
        {remaining !== null && remaining > 0 && (
          <span className="ml-2 text-fg-muted">
            · {remaining} books still need enrichment
          </span>
        )}
      </p>

      {state === "idle" && (
        <button
          onClick={start}
          className="text-sm border border-line rounded-lg px-4 py-2.5 text-fg-muted hover:border-fg-muted hover:text-fg transition-colors"
        >
          enrich library metadata
        </button>
      )}

      {state === "running" && (
        <div className="space-y-2">
          <p className="text-xs text-fg-muted animate-pulse">
            enriching{total ? ` ${total} books` : ""}… running in the background
          </p>
          <button
            onClick={checkProgress}
            className="text-xs text-fg-faint hover:text-fg-muted transition-colors"
          >
            check progress
          </button>
        </div>
      )}

      {state === "done" && (
        <div className="space-y-2">
          <p className="text-xs text-sage">
            {total === 0
              ? "All books are already enriched."
              : `Done — ${total} book${total === 1 ? "" : "s"} enriched.`}
          </p>
          <button
            onClick={() => {
              setState("idle");
              setTotal(null);
              setRemaining(null);
            }}
            className="text-xs text-fg-faint hover:text-fg-muted transition-colors"
          >
            run again
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-2">
          <p className="text-xs text-red-400">
            Something went wrong. Check that HARDCOVER_API_TOKEN is set.
          </p>
          <button
            onClick={() => setState("idle")}
            className="text-xs text-fg-faint hover:text-fg-muted transition-colors"
          >
            try again
          </button>
        </div>
      )}
    </div>
  );
}
