"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut, getDisplayName } from "@/lib/auth";
import { useTheme } from "@/providers/ThemeProvider";
import { parseGoodreadsCSV, type GoodreadsPreview } from "@/lib/goodreads";
import { apiFetch } from "@/lib/api";
import type { User } from "@supabase/supabase-js";
import { STATUS_LABEL } from "@/lib/statusMeta";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-stone-100 pb-10 mb-10 last:border-0 last:mb-0 last:pb-0">
      <p className="section-label mb-6">{title}</p>
      {children}
    </section>
  );
}

// ─── Goodreads import (inlined) ───────────────────────────────────────────────

function GoodreadsImport() {
  const [state, setState] = useState<
    "idle" | "preview" | "running" | "done" | "error"
  >("idle");
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
    // Read import state directly from Supabase auth — no extra API call needed
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      const imp = meta?.goodreads_import;
      if (imp?.status === "running") {
        // Resume polling for an import started in a previous session
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

  if (state === "running") {
    const pct = progress?.total
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;
    return (
      <div className="space-y-3 max-w-sm">
        <p className="text-xs text-[var(--fg-muted)] animate-pulse">
          importing in the background — you can navigate away
        </p>
        {progress && (
          <>
            <p className="text-xs text-[var(--fg-faint)]">
              {progress.processed} / {progress.total} books · {pct}%
            </p>
            <div className="w-full h-0.5 bg-[var(--border-light)] rounded-full overflow-hidden">
              <div
                style={{ width: `${pct}%` }}
                className="h-full bg-[var(--sage)] transition-all duration-500"
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
          className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors"
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
          className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors"
        >
          try again
        </button>
      </div>
    );
  }

  if (state === "preview") {
    return (
      <div className="max-w-sm">
        <div className="mb-4 p-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg space-y-1">
          <p className="text-xs text-[var(--fg-muted)]">
            <span className="font-semibold text-[var(--fg-heading)]">
              {previews.length}
            </span>{" "}
            books found
          </p>
          <p className="text-xs text-[var(--fg-faint)]">
            · {finishedCount} finished
          </p>
          {dnfCount > 0 && (
            <p className="text-xs text-[var(--fg-faint)]">
              · {dnfCount} did not finish
            </p>
          )}
          <p className="text-xs text-[var(--fg-faint)]">
            · {readingCount} currently reading
          </p>
          <p className="text-xs text-[var(--fg-faint)]">
            · {wantCount} want to read
          </p>
        </div>
        <div className="space-y-0.5 mb-6 max-h-60 overflow-y-auto">
          {previews.map(({ entry }) => (
            <div key={entry.id} className="flex items-baseline gap-3 py-0.5">
              <span className="text-xs text-[var(--fg-faint)]">·</span>
              <span className="text-sm text-[var(--fg)] truncate flex-1">
                {entry.title}
              </span>
              <span className="text-xs text-[var(--fg-muted)] shrink-0">
                {entry.author}
              </span>
              <span className="text-xs text-[var(--fg-faint)] shrink-0">
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
            className="text-sm text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors px-4 py-2"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-[var(--fg-faint)] mb-4">
        Export your library from Goodreads (My Books → Export Library) then
        upload the CSV. Runs in the background — you can navigate away once
        started.
        {alreadyImported && (
          <span className="text-[var(--fg-faint)] ml-2">
            · previously imported
          </span>
        )}
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="text-sm border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--fg-muted)] hover:border-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
      >
        choose CSV file
      </button>
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </div>
  );
}

// ─── Enrich library ───────────────────────────────────────────────────────────
function EnrichLibrary() {
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
      // Poll every 15s — server is processing in the background
      pollRef.current = setInterval(checkProgress, 15_000);
    } catch {
      setState("error");
    }
  };

  // Clean up poll on unmount
  useEffect(() => () => stopPolling(), []);

  return (
    <div>
      <p className="text-xs text-[var(--fg-faint)] mb-4">
        Fills in covers, page counts, ISBNs, and genres using Hardcover. Runs in
        the background — you can navigate away.
        {remaining !== null && remaining > 0 && (
          <span className="ml-2 text-[var(--fg-muted)]">
            · {remaining} books still need enrichment
          </span>
        )}
      </p>

      {state === "idle" && (
        <button
          onClick={start}
          className="text-sm border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--fg-muted)] hover:border-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          enrich library metadata
        </button>
      )}

      {state === "running" && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--fg-muted)] animate-pulse">
            enriching{total ? ` ${total} books` : ""}… running in the background
          </p>
          <button
            onClick={checkProgress}
            className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors"
          >
            check progress
          </button>
        </div>
      )}

      {state === "done" && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--sage)]">
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
            className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors"
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
            className="text-xs text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-colors"
          >
            try again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setName(getDisplayName(data.user ?? { email: "" }));
      setLoading(false);
    });
  }, []);

  const handleSaveName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSaving(true);
    setNameMsg("");
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim() },
      });
      if (error) throw error;
      setNameMsg("Saved.");
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setNameSaving(false);
      setTimeout(() => setNameMsg(""), 3000);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError("");
    setPwMsg("");
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setPwMsg("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(""), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-content animate-pulse">
          <div className="h-8 w-40 bg-stone-200 rounded mb-3" />
          <div className="h-3 w-24 bg-stone-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10 pb-8 border-b border-stone-200">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[var(--fg-heading)] tracking-tight">
            profile & settings
          </h1>
          {user?.email && (
            <p className="text-xs text-stone-400 mt-2">{user.email}</p>
          )}
        </div>

        {/* ── Profile ── */}
        <Section title="profile">
          <form onSubmit={handleSaveName} className="max-w-sm space-y-4">
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                display name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="underline-input w-full"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={nameSaving}
                className="btn-primary"
              >
                {nameSaving ? "saving..." : "save"}
              </button>
              {nameMsg && (
                <span className="text-xs text-stone-400">{nameMsg}</span>
              )}
            </div>
          </form>
        </Section>

        {/* ── Password ── */}
        <Section title="change password">
          <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                new password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="underline-input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="underline-input w-full"
              />
            </div>
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={pwSaving || !newPassword}
                className="btn-primary"
              >
                {pwSaving ? "updating..." : "update password"}
              </button>
              {pwMsg && <span className="text-xs text-stone-400">{pwMsg}</span>}
            </div>
          </form>
        </Section>

        {/* ── Appearance ── */}
        <Section title="appearance">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-stone-400 mb-3">theme</p>
              <div className="flex gap-2">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      if (theme !== t) toggle();
                    }}
                    className={`text-xs px-4 py-2 rounded-full border transition-colors ${
                      theme === t
                        ? "bg-plum text-white border-plum"
                        : "text-stone-500 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {t === "light" ? "☀ light" : "◑ dark"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Goodreads import ── */}
        <Section title="import from goodreads">
          {user && <GoodreadsImport />}
        </Section>

        {/* ── Enrich library ── */}
        <Section title="enrich library metadata">
          <EnrichLibrary />
        </Section>

        {/* ── Account ── */}
        <Section title="account">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-stone-400 mb-1">signed in as</p>
              <p className="text-sm text-stone-700">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-stone-500 border border-stone-200 px-4 py-2 rounded-full hover:border-stone-400 hover:text-stone-800 transition-colors"
            >
              sign out
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
