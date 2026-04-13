"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut, getDisplayName } from "@/lib/auth";
import { useTheme } from "@/components/ThemeProvider";
import { parseGoodreadsCSV, type GoodreadsPreview } from "@/lib/goodreads";
import { lookupBook } from "@/lib/catalog";
import type { User } from "@supabase/supabase-js";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-stone-100 pb-10 mb-10 last:border-0 last:mb-0 last:pb-0">
      <p className="section-label mb-6">{title}</p>
      {children}
    </section>
  );
}

// ─── Goodreads import (inlined) ───────────────────────────────────────────────
type ImportState = "idle" | "preview" | "importing" | "done" | "error";

const BATCH = 5;

const STATUS_LABEL: Record<string, string> = {
  reading: "reading",
  finished: "read",
  "want-to-read": "want to read",
  "did-not-finish": "did not finish",
};

function GoodreadsImport({ userId }: { userId: string }) {
  const [importState, setImportState] = useState<ImportState>("idle");
  const [previews, setPreviews] = useState<GoodreadsPreview[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [alreadyImported, setAlreadyImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAlreadyImported(data.user?.user_metadata?.goodreads_imported === true);
    });
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseGoodreadsCSV(ev.target?.result as string);
        if (!parsed.length) { setError("No books found. Make sure this is a Goodreads export CSV."); return; }
        setPreviews(parsed);
        setImportState("preview");
      } catch { setError("Failed to parse CSV. Please check the file format."); }
    };
    reader.readAsText(file);
  };

  async function processEntry(entry: {
    title: string; author: string; genres: string[]; status: string;
    dateStarted: string; dateFinished: string; dateShelved: string;
    rating: number; feeling: string; createdAt: string; updatedAt: string;
  }) {
    // Enrich with Google Books — genres, release date, canonical author
    const googleBook = await lookupBook(entry.title, entry.author);
    const genres = googleBook?.genres?.length
      ? Array.from(new Set([...entry.genres, ...googleBook.genres]))
      : entry.genres;
    const releaseDate = googleBook?.releaseDate ?? "";
    const author = entry.author || googleBook?.author || "";

    const { data: book } = await supabase
      .from("books")
      .select("id, status, date_finished, date_shelved, genres, release_date, book_reads(id, status, date_finished, date_shelved)")
      .eq("user_id", userId)
      .ilike("title", entry.title)
      .ilike("author", author || "%")
      .maybeSingle();

    if (!book) {
      await supabase.from("books").insert({
        id: crypto.randomUUID(), user_id: userId,
        title: entry.title, author, release_date: releaseDate, genres,
        status: entry.status,
        date_started: entry.dateStarted || null,
        date_finished: entry.dateFinished || null,
        date_shelved: entry.dateShelved || null,
        rating: entry.rating, feeling: entry.feeling, bookmarked: false,
        created_at: entry.createdAt, updated_at: entry.updatedAt,
      });
      return;
    }

    // Patch existing book with enriched metadata if Google Books had better data
    const mergedGenres = Array.from(new Set([...(book.genres ?? []), ...genres]));
    const needsPatch = (mergedGenres.length > (book.genres ?? []).length) ||
      (!book.release_date && releaseDate);
    if (needsPatch) {
      await supabase.from("books").update({
        genres: mergedGenres,
        ...(releaseDate && !book.release_date ? { release_date: releaseDate } : {}),
      }).eq("id", book.id);
    }

    if (entry.status === "finished" && entry.dateFinished !== book.date_finished) {
      const reads = (book.book_reads ?? []) as { status: string; date_finished: string | null }[];
      if (!reads.some((r) => r.status === "finished" && r.date_finished === entry.dateFinished)) {
        await supabase.from("book_reads").insert({
          book_id: book.id, status: entry.status,
          date_started: entry.dateStarted || null, date_finished: entry.dateFinished || null,
          date_shelved: null, rating: entry.rating, feeling: entry.feeling,
          created_at: entry.createdAt, updated_at: entry.updatedAt,
        });
      }
    } else if (entry.status === "did-not-finish" && entry.dateShelved !== book.date_shelved) {
      const reads = (book.book_reads ?? []) as { status: string; date_shelved: string | null }[];
      if (!reads.some((r) => r.status === "did-not-finish" && r.date_shelved === entry.dateShelved)) {
        await supabase.from("book_reads").insert({
          book_id: book.id, status: entry.status,
          date_started: entry.dateStarted || null, date_finished: null,
          date_shelved: entry.dateShelved || null, rating: entry.rating, feeling: entry.feeling,
          created_at: entry.createdAt, updated_at: entry.updatedAt,
        });
      }
    }
  }

  const handleImport = async () => {
    setImportState("importing");
    setProgress(0);
    try {
      for (let i = 0; i < previews.length; i += BATCH) {
        const batch = previews.slice(i, i + BATCH).map(({ entry }) => entry);
        await Promise.allSettled(batch.map((e) => processEntry(e)));
        setProgress(i + batch.length);
        if (i + BATCH < previews.length) await new Promise((r) => setTimeout(r, 300));
      }
      await supabase.auth.updateUser({ data: { goodreads_imported: true } });
      setAlreadyImported(true);
      setImportState("done");
    } catch (err) {
      setImportState("error");
      setError(String(err));
    }
  };

  const reset = () => {
    setImportState("idle");
    setPreviews([]);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const finishedCount = previews.filter((p) => p.entry.status === "finished").length;
  const dnfCount      = previews.filter((p) => p.entry.status === "did-not-finish").length;
  const readingCount  = previews.filter((p) => p.entry.status === "reading").length;
  const wantCount     = previews.filter((p) => p.entry.status === "want-to-read").length;

  if (alreadyImported && importState !== "idle") {
    // allow re-import after done
  }

  if (importState === "done") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-stone-700">{previews.length} books imported.</p>
        <button onClick={reset} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
          import again
        </button>
      </div>
    );
  }

  if (importState === "importing") {
    return (
      <div className="space-y-2 max-w-sm">
        <p className="text-sm text-stone-500">Importing... {progress} / {previews.length}</p>
        <div className="w-full h-0.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            style={{ width: `${previews.length ? Math.round((progress / previews.length) * 100) : 0}%` }}
            className="h-full bg-stone-400 transition-all duration-300"
          />
        </div>
      </div>
    );
  }

  if (importState === "error") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-400">{error || "Something went wrong."}</p>
        <button onClick={reset} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">try again</button>
      </div>
    );
  }

  if (importState === "preview") {
    return (
      <div className="max-w-sm">
        <div className="mb-4 p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
          <p className="text-xs text-stone-500"><span className="text-stone-800 font-semibold">{previews.length}</span> books found</p>
          <p className="text-xs text-stone-400">· {finishedCount} finished</p>
          {dnfCount > 0 && <p className="text-xs text-stone-400">· {dnfCount} did not finish</p>}
          <p className="text-xs text-stone-400">· {readingCount} currently reading</p>
          <p className="text-xs text-stone-400">· {wantCount} want to read</p>
        </div>
        <div className="space-y-0.5 mb-6 max-h-60 overflow-y-auto">
          {previews.map(({ entry }) => (
            <div key={entry.id} className="flex items-baseline gap-3 py-0.5">
              <span className="text-xs text-stone-300">·</span>
              <span className="text-sm text-stone-700 truncate flex-1">{entry.title}</span>
              <span className="text-xs text-stone-400 shrink-0">{entry.author}</span>
              <span className="text-xs text-stone-300 shrink-0">{STATUS_LABEL[entry.status]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={handleImport} className="btn-primary">import all</button>
          <button onClick={reset} className="text-sm text-stone-400 hover:text-stone-700 transition-colors px-4 py-2">cancel</button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div>
      <p className="text-xs text-stone-400 mb-4">
        Export your library from Goodreads (My Books → Export Library) then upload the CSV.
        {alreadyImported && <span className="text-stone-300 ml-2">· previously imported</span>}
      </p>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        className="text-sm border border-stone-300 rounded-lg px-4 py-2.5 text-stone-600 hover:border-stone-500 hover:text-stone-800 transition-colors"
      >
        Choose CSV file
      </button>
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
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

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSaving(true);
    setNameMsg("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
      if (error) throw error;
      setNameMsg("Saved.");
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setNameSaving(false);
      setTimeout(() => setNameMsg(""), 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwMsg("");
    if (newPassword.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords don't match."); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwMsg("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to update password.");
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
          {user?.email && <p className="text-xs text-stone-400 mt-2">{user.email}</p>}
        </div>

        {/* ── Profile ── */}
        <Section title="profile">
          <form onSubmit={handleSaveName} className="max-w-sm space-y-4">
            <div>
              <label className="text-xs text-stone-400 block mb-1">display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="underline-input w-full"
              />
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={nameSaving} className="btn-primary">
                {nameSaving ? "saving..." : "save"}
              </button>
              {nameMsg && <span className="text-xs text-stone-400">{nameMsg}</span>}
            </div>
          </form>
        </Section>

        {/* ── Password ── */}
        <Section title="change password">
          <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
            <div>
              <label className="text-xs text-stone-400 block mb-1">new password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="underline-input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">confirm new password</label>
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
              <button type="submit" disabled={pwSaving || !newPassword} className="btn-primary">
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
                    onClick={() => { if (theme !== t) toggle(); }}
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
          {user && <GoodreadsImport userId={user.id} />}
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
