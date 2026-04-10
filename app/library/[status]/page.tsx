"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { getEntries } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/statusMeta";
import { StarDisplay } from "@/components/StarDisplay";
import type { BookEntry } from "@/types";

const VALID_STATUSES = new Set(["reading", "finished", "want-to-read", "did-not-finish"]);

const MOOD_COLORS: Record<string, string> = {
  cozy: "#C97B5A", dark: "#374151", hopeful: "#7B9E87", funny: "#D4A843",
  "slow-burn": "#C4B5D4", "heart-wrenching": "#BE185D", whimsical: "#8B5CF6",
  "thought-provoking": "#2D1B2E", escapist: "#1565C0",
};

export default function StatusCatalogPage() {
  const { status } = useParams<{ status: string }>();
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeMood, setActiveMood] = useState<string | null>(null);

  if (!VALID_STATUSES.has(status)) notFound();

  useEffect(() => {
    getEntries()
      .then((all) => setEntries(all.filter((e) => e.status === status)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  const allMoods = Array.from(new Set(entries.flatMap((e) => e.moodTags))).sort();

  const filtered = entries.filter((e) => {
    const matchSearch = !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase());
    const matchMood = !activeMood || e.moodTags.includes(activeMood);
    return matchSearch && matchMood;
  });

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href="/library" className="back-link">← library</Link>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <h1 className="page-title">{STATUS_LABEL[status]}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("grid")}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ background: view === "grid" ? "var(--bg-hover)" : "transparent", color: view === "grid" ? "var(--fg)" : "var(--fg-faint)" }}
            >
              ▦
            </button>
            <button
              onClick={() => setView("list")}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ background: view === "list" ? "var(--bg-hover)" : "transparent", color: view === "list" ? "var(--fg)" : "var(--fg-faint)" }}
            >
              ☰
            </button>
          </div>
        </div>
        <p className="text-xs mb-8" style={{ color: "var(--fg-faint)" }}>{entries.length} books</p>

        {/* Search */}
        <div className="mb-6">
          <input
            id="status-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by title or author..."
            className="underline-input"
            disabled={loading}
          />
        </div>

        {/* Mood filter chips */}
        {allMoods.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveMood(null)}
              className="text-xs px-3 py-1 rounded-full transition-colors"
              style={{
                background: !activeMood ? "var(--plum)" : "var(--bg-surface)",
                color: !activeMood ? "#fff" : "var(--fg-muted)",
                border: "1px solid var(--border-light)",
              }}
            >
              all
            </button>
            {allMoods.map((mood) => {
              const color = MOOD_COLORS[mood] ?? "#2D1B2E";
              const active = activeMood === mood;
              return (
                <button
                  key={mood}
                  onClick={() => setActiveMood(active ? null : mood)}
                  className="text-xs px-3 py-1 rounded-full transition-colors"
                  style={{
                    background: active ? `${color}22` : "var(--bg-surface)",
                    color: active ? color : "var(--fg-muted)",
                    border: `1px solid ${active ? color : "var(--border-light)"}`,
                  }}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="rounded-lg mb-2" style={{ aspectRatio: "2/3", background: "var(--border)" }} />
                <div className="h-2.5 rounded mb-1" style={{ background: "var(--border)", width: "80%" }} />
                <div className="h-2 rounded" style={{ background: "var(--border)", width: "50%" }} />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-xs" style={{ color: "var(--fg-faint)" }}>no books found.</p>
        )}

        {!loading && filtered.length > 0 && view === "grid" && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((e) => (
              <Link key={e.id} href={`/book/${e.id}`} className="group relative">
                <div
                  className="relative mb-2 rounded-lg flex flex-col justify-between p-2.5 group-hover:opacity-85 transition-opacity"
                  style={{ height: 130, background: "var(--bg-hover)", border: "1px solid var(--border-light)" }}
                >
                  {e.moodTags.length > 0 && (
                    <span
                      className="self-start text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{ background: `${MOOD_COLORS[e.moodTags[0]] ?? "#2D1B2E"}cc`, color: "#fff" }}
                    >
                      {e.moodTags[0]}
                    </span>
                  )}
                  {e.rating > 0 && (
                    <span className="self-end text-[10px]" style={{ color: "#D4A843" }}>
                      {"★".repeat(Math.round(e.rating))}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium leading-tight truncate" style={{ color: "var(--fg)" }}>{e.title || "untitled"}</p>
                {e.author && <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--fg-faint)" }}>{e.author}</p>}
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && view === "list" && (
          <div className="space-y-0.5">
            {filtered.map((e) => (
              <Link key={e.id} href={`/book/${e.id}`} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[rgba(45,27,46,0.04)] transition-colors group">
                <span className="text-sm truncate flex-1" style={{ color: "var(--fg)" }}>{e.title || "untitled"}</span>
                {e.author && <span className="text-xs shrink-0 hidden sm:block" style={{ color: "var(--fg-faint)" }}>{e.author}</span>}
                <span className="dot-leader hidden sm:block" />
                {e.rating > 0 && <StarDisplay rating={e.rating} size={11} />}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
