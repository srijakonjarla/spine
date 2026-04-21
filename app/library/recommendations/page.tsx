"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getRecommendations,
  createRecommendation,
  deleteRecommendation,
  type Recommendation,
} from "@/lib/recommendations";
import { CatalogSearch } from "@/components/CatalogSearch";
import { type CatalogEntry } from "@/lib/catalog";
import { toast } from "@/lib/toast";

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [direction, setDirection] = useState<"incoming" | "outgoing">(
    "incoming",
  );
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [by, setBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRecommendations()
      .then(setRecs)
      .catch(() => toast("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const handleCatalogSelect = (entry: CatalogEntry) => {
    setTitle(entry.title);
    setAuthor(entry.author);
  };

  const handleAdd = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createRecommendation({
        title,
        author,
        recommendedBy: by,
        notes,
        direction,
      });
      setRecs((prev) => [created, ...prev]);
      setTitle("");
      setAuthor("");
      setBy("");
      setNotes("");
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRecommendation(id);
    setRecs((prev) => prev.filter((r) => r.id !== id));
  };

  const incoming = recs.filter((r) => r.direction === "incoming");
  const outgoing = recs.filter((r) => r.direction === "outgoing");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href="/library" className="back-link">
            ← library
          </Link>
        </div>

        <div className="mb-10 pb-8 border-b border-stone-200">
          <h1 className="font-serif text-3xl font-semibold page-title tracking-tight">
            recommendations
          </h1>
          {!loading && (
            <p className="text-xs text-stone-400 mt-3">
              {incoming.length} received · {outgoing.length} given
            </p>
          )}
        </div>

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stone-100 rounded-lg" />
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-10">
            {incoming.length > 0 && (
              <section>
                <p className="section-label mb-4">recommended to me</p>
                <div className="space-y-3">
                  {incoming.map((rec) => (
                    <div
                      key={rec.id}
                      className="group flex gap-4 py-2 border-b border-stone-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {rec.title}
                        </p>
                        <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                          {rec.author && (
                            <span className="text-xs text-stone-500">
                              {rec.author}
                            </span>
                          )}
                          {rec.recommendedBy && (
                            <span className="text-xs text-stone-400">
                              · by {rec.recommendedBy}
                            </span>
                          )}
                          <span className="text-xs text-stone-300">
                            {formatDate(rec.createdAt)}
                          </span>
                        </div>
                        {rec.notes && (
                          <p className="text-xs text-stone-400 italic mt-1">
                            {rec.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="text-xs text-stone-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 self-start"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {outgoing.length > 0 && (
              <section>
                <p className="section-label mb-4">recommended by me</p>
                <div className="space-y-3">
                  {outgoing.map((rec) => (
                    <div
                      key={rec.id}
                      className="group flex gap-4 py-2 border-b border-stone-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {rec.title}
                        </p>
                        <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                          {rec.author && (
                            <span className="text-xs text-stone-500">
                              {rec.author}
                            </span>
                          )}
                          {rec.recommendedBy && (
                            <span className="text-xs text-stone-400">
                              · to {rec.recommendedBy}
                            </span>
                          )}
                          <span className="text-xs text-stone-300">
                            {formatDate(rec.createdAt)}
                          </span>
                        </div>
                        {rec.notes && (
                          <p className="text-xs text-stone-400 italic mt-1">
                            {rec.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="text-xs text-stone-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 self-start"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {recs.length === 0 && !showAdd && (
              <p className="text-xs text-stone-400">
                No recommendations logged yet.
              </p>
            )}
          </div>
        )}

        {/* Add form */}
        <div className="mt-8">
          {showAdd ? (
            <form
              onSubmit={handleAdd}
              className="border border-stone-200 rounded-xl p-6 space-y-4"
            >
              {/* Direction toggle */}
              <div className="flex gap-2 mb-2">
                {(["incoming", "outgoing"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      direction === d
                        ? "bg-stone-900 text-white border-stone-900"
                        : "text-stone-400 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {d === "incoming"
                      ? "recommended to me"
                      : "recommended by me"}
                  </button>
                ))}
              </div>

              <CatalogSearch
                value={title}
                onChange={setTitle}
                onSelect={handleCatalogSelect}
                onSubmit={() => {}}
                placeholder="book title"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">
                    author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-transparent border-b border-stone-200 pb-1 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-400 block mb-1">
                    {direction === "incoming"
                      ? "recommended by"
                      : "recommended to"}
                  </label>
                  <input
                    type="text"
                    value={by}
                    onChange={(e) => setBy(e.target.value)}
                    placeholder="name..."
                    className="w-full bg-transparent border-b border-stone-200 pb-1 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">
                  notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="context, why it was recommended..."
                  className="w-full bg-transparent border-b border-stone-200 pb-1 text-stone-900 text-sm focus:outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!title.trim() || saving}
                  className="text-sm text-white bg-stone-900 px-5 py-2 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "saving..." : "log recommendation"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setTitle("");
                    setAuthor("");
                    setBy("");
                    setNotes("");
                  }}
                  className="text-sm text-stone-400 hover:text-stone-700 transition-colors px-4 py-2"
                >
                  cancel
                </button>
              </div>
            </form>
          ) : (
            !loading && (
              <button
                onClick={() => setShowAdd(true)}
                className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
              >
                + log recommendation
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
