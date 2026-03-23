"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getLists, createList, reorderLists } from "@/lib/lists";
import { useDraggableList } from "@/hooks/useDraggableList";
import type { BookList } from "@/types";

interface Template {
  listType: string;
  label: string;
  description: string;
  dateLabel: string;
  notesLabel: string;
}

const TEMPLATES: Template[] = [
  {
    listType: "anticipated",
    label: "most anticipated",
    description: "upcoming reads you're excited about",
    dateLabel: "expected release",
    notesLabel: "notes",
  },
  {
    listType: "book_club",
    label: "book club",
    description: "picks for your book club",
    dateLabel: "meeting date",
    notesLabel: "discussion notes",
  },
  {
    listType: "favorites",
    label: "favorites",
    description: "your all-time favorites",
    dateLabel: "",
    notesLabel: "why i love it",
  },
  {
    listType: "disappointing",
    label: "most disappointing",
    description: "books that let you down",
    dateLabel: "",
    notesLabel: "why it disappointed",
  },
  {
    listType: "collection",
    label: "physical collection",
    description: "books in, books out",
    dateLabel: "date",
    notesLabel: "where",
  },
];

export default function ListsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const router = useRouter();
  const [lists, setLists] = useState<BookList[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const { dragProps } = useDraggableList(setLists, reorderLists);

  useEffect(() => {
    getLists(year).then(setLists).catch(console.error);
  }, [year]);

  const handleCreateFromTemplate = async (t: Template) => {
    if (adding) return;
    setAdding(t.listType);
    try {
      const list = await createList(year, t.label, {
        listType: t.listType,
        dateLabel: t.dateLabel,
        notesLabel: t.notesLabel,
      });
      router.push(`/${year}/lists/${list.id}`);
    } catch (err) {
      console.error(err);
      setAdding(null);
    }
  };

  const handleCreateCustom = async () => {
    const title = customInput.trim();
    if (!title || adding) return;
    setAdding("custom");
    try {
      const list = await createList(year, title, { listType: "general" });
      router.push(`/${year}/lists/${list.id}`);
    } catch (err) {
      console.error(err);
      setAdding(null);
    }
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10">
          <Link href={`/${year}`} className="back-link">← {year}</Link>
        </div>

        <div className="mb-10 pb-8 border-b border-stone-200">
          <p className="text-xs text-stone-300 mb-2 tracking-widest uppercase">reading journal · {year}</p>
          <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">lists</h1>
        </div>

        {/* existing lists */}
        {lists.length > 0 && (
          <div className="mb-12">
            <p className="section-label mb-4">your lists</p>
            <div className="space-y-0.5">
              {lists.map((list) => (
                <div
                  key={list.id}
                  {...dragProps(list.id)}
                  className="group flex items-baseline gap-2"
                >
                  <span className="text-xs text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing select-none shrink-0">⠿</span>
                  <Link href={`/${year}/lists/${list.id}`} className="row-item group flex-1">
                    <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">{list.title}</span>
                    <span className="dot-leader" />
                    <span className="text-xs text-stone-300">{list.items.length}</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* templates */}
        <div className="mb-10">
          <p className="section-label mb-4">start from a template</p>
          <div className="space-y-1">
            {TEMPLATES.map((t) => {
              const existingList = lists.find((l) => l.listType === t.listType);
              if (existingList) {
                return (
                  <Link
                    key={t.listType}
                    href={`/${year}/lists/${existingList.id}`}
                    className="w-full flex items-baseline gap-3 py-2.5 px-3 -mx-3 rounded hover:bg-stone-100/60 transition-colors group"
                  >
                    <span className="text-xs text-stone-300 shrink-0">✓</span>
                    <span className="text-sm text-stone-400 group-hover:text-stone-600 transition-colors">
                      {t.label}
                    </span>
                    <span className="dot-leader" />
                    <span className="text-xs text-stone-300 shrink-0 italic">created</span>
                  </Link>
                );
              }
              return (
                <button
                  key={t.listType}
                  onClick={() => handleCreateFromTemplate(t)}
                  disabled={!!adding}
                  className="w-full text-left flex items-baseline gap-3 py-2.5 px-3 -mx-3 rounded hover:bg-stone-100/60 transition-colors group disabled:opacity-40"
                >
                  <span className="text-xs text-stone-300 shrink-0">+</span>
                  <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">
                    {t.label}
                  </span>
                  <span className="dot-leader" />
                  <span className="text-xs text-stone-300 shrink-0 italic">{t.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* custom */}
        <div>
          <p className="section-label mb-3">custom list</p>
          <input
            id="custom-list-name"
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCustom()}
            placeholder="name your list..."
            disabled={!!adding}
            className="underline-input"
          />
          {customInput.trim() && !adding && <p className="hint-text">↵ to create</p>}
        </div>
      </div>
    </div>
  );
}
