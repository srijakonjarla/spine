"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLists, createList } from "@/lib/lists";
import type { BookList } from "@/types";
import { ListCard } from "@/components/lists/ListCard";
import { ListCreateModal } from "@/components/lists/ListCreateModal";

export default function ListsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const router = useRouter();

  const [lists, setLists] = useState<BookList[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLists(year).then(setLists).catch(console.error);
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
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="mx-auto px-6 py-12 max-w-[56rem]">

        <div className="flex items-baseline justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1 text-[var(--fg-faint)]">reading journal · {year}</p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--fg-heading)]">lists</h1>
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
            <span className="font-[family-name:var(--font-caveat)] text-[14px] text-[var(--fg-muted)]">create a new list</span>
            <span className="text-[11px] text-[var(--fg-faint)] max-w-[140px] text-center leading-relaxed">books, ideas, bullet points — anything</span>
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
