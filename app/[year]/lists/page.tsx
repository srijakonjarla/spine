"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getLists, createList } from "../../lib/lists";
import type { BookList } from "../../types";

export default function ListsPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const router = useRouter();
  const [lists, setLists] = useState<BookList[]>([]);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getLists(year).then(setLists).catch(console.error);
  }, [year]);

  const handleCreate = async () => {
    const title = input.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const list = await createList(year, title);
      router.push(`/${year}/lists/${list.id}`);
    } catch (err) {
      console.error(err);
      setAdding(false);
    }
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-8">
          <Link href={`/${year}`} className="back-link">
            ← {year}
          </Link>
        </div>

        <h1 className="page-title mb-8">lists · {year}</h1>

        {/* new list input */}
        <div className="mb-10">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="new list name..."
            disabled={adding}
            className="underline-input"
          />
          {input.trim() && !adding && (
            <p className="hint-text">↵ to create</p>
          )}
        </div>

        {/* lists */}
        {lists.length === 0 ? (
          <p className="text-xs text-stone-400">no lists yet. create one above.</p>
        ) : (
          <div className="space-y-0.5">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/${year}/lists/${list.id}`}
                className="row-item group"
              >
                <span className="text-xs text-stone-300">·</span>
                <span className="text-sm text-stone-800 group-hover:text-stone-600 truncate">
                  {list.title}
                </span>
                <span className="dot-leader" />
                <span className="text-xs text-stone-300">{list.items.length}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
