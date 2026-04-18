"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLists, createList } from "@/lib/lists";
import type { BookList } from "@/types";
import { ListCard } from "@/components/lists/ListCard";
import { ListCreateModal } from "@/components/lists/ListCreateModal";
import { toast } from "@/lib/toast";

export default function ListsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const router = useRouter();

  const [lists, setLists] = useState<BookList[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLists(year)
      .then(setLists)
      .catch(() => toast("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, [year]);

  const handleCreate = async (opts: {
    name: string;
    listType: string;
    color: string;
    emoji: string;
    description: string;
  }) => {
    if (saving) return;
    setSaving(true);
    try {
      const list = await createList(year, opts.name, {
        listType: opts.listType,
        color: opts.color,
        emoji: opts.emoji,
        description: opts.description,
      });
      router.push(`/${year}/lists/${list.id}`);
    } catch {
      toast("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="page">
        <div className="mx-auto px-6 py-12 animate-pulse">
          <div className="h-5 w-16 bg-[var(--bg-hover)] rounded mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-[var(--bg-hover)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="page">
      <div className="mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1 text-[var(--fg-faint)]">
              reading journal · {year}
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--fg-heading)]">
              lists
            </h1>
            {lists.length > 0 && (
              <p className="font-[family-name:var(--font-caveat)] text-[15px] text-[var(--terra)] mt-1">
                {lists.length} collections — make as many as you need
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="text-[13px] font-semibold px-4 py-2 rounded-full text-white bg-[var(--plum)] hover:bg-[var(--plum-light)] transition-colors"
          >
            + new list
          </button>
        </div>

        {/* Card grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} year={year} />
          ))}

          {/* New list CTA card */}
          <button
            onClick={() => setShowForm(true)}
            className="rounded-2xl flex flex-col items-center justify-center gap-2 min-h-[180px] transition-all border-2 border-dashed border-[var(--border-light)] hover:border-[var(--terra)] hover:bg-[var(--terra)]/4"
          >
            <span className="text-[28px] text-[var(--fg-faint)]">＋</span>
            <span className="font-[family-name:var(--font-caveat)] text-sm text-[var(--fg-muted)]">
              create a new list
            </span>
            <span className="text-[11px] text-[var(--fg-faint)] text-center leading-relaxed">
              books, ideas, bullet points — anything
            </span>
          </button>
        </div>
      </div>

      {showForm && (
        <ListCreateModal
          onClose={() => setShowForm(false)}
          onCreate={handleCreate}
          saving={saving}
        />
      )}
    </div>
  );
}
