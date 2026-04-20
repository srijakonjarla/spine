"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createList } from "@/lib/lists";
import { useYear } from "@/providers/YearContext";
import { ListCard } from "@/components/lists/ListCard";
import { ListCreateModal } from "@/components/lists/ListCreateModal";
import { toast } from "@/lib/toast";

export default function ListsPage() {
  const { year, loading, lists, setLists } = useYear();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setLists((prev) => [...prev, list]);
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
          <div className="h-5 w-16 bg-hover rounded mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-hover rounded-xl" />
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
            <p className="text-xs uppercase tracking-widest mb-1 text-fg-faint">
              reading journal · {year}
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg-heading">
              lists
            </h1>
            {lists.length > 0 && (
              <p className="font-hand text-body-md text-terra mt-1">
                {lists.length} collections — make as many as you need
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="text-note font-semibold px-4 py-2 rounded-full text-white bg-plum hover:bg-plum-light transition-colors"
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
            className="rounded-2xl flex flex-col items-center justify-center gap-2 min-h-45 transition-all border-2 border-dashed border-line hover:border-terra hover:bg-terra/4"
          >
            <span className="text-display text-fg-faint">＋</span>
            <span className="font-hand text-sm text-fg-muted">
              create a new list
            </span>
            <span className="text-caption text-fg-faint text-center leading-relaxed">
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
          existingTypes={lists.map((l) => l.listType)}
        />
      )}
    </div>
  );
}
