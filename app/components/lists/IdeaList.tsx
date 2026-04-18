"use client";

import { useState, useRef } from "react";
import { addListItem } from "@/lib/lists";
import type { ListItem } from "@/types";

const BULLET_SYMBOLS = ["→", "●", "✦", "◆", "○", "—", "✓", "★"];

interface Props {
  listId: string;
  items: ListItem[];
  isChecklist: boolean;
  bullet: string;
  draggingId: string | null;
  itemProps: (index: number, id: string) => React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  onToggleCheck: (id: string, type: string) => void;
  onRemove: (id: string) => void;
  onItemAdded: (item: ListItem) => void;
  onBulletSymbolChange: (sym: string) => void;
}

export function IdeaList({
  listId,
  items,
  isChecklist,
  bullet,
  draggingId,
  itemProps,
  onToggleCheck,
  onRemove,
  onItemAdded,
  onBulletSymbolChange,
}: Props) {
  const [inlineText, setInlineText] = useState("");
  const [adding, setAdding] = useState(false);
  const inlineRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    const title = inlineText.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const item = await addListItem(listId, { title });
      onItemAdded(item);
      setInlineText("");
      setTimeout(() => inlineRef.current?.focus(), 50);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      {/* Bullet symbol picker (not for checklist) */}
      {!isChecklist && (
        <div className="flex items-center gap-3 mb-5 font-[family-name:var(--font-caveat)] text-[13px] text-[var(--fg-muted)]">
          symbol
          <div className="flex gap-1.5">
            {BULLET_SYMBOLS.map((sym) => (
              <button
                key={sym}
                onClick={() => onBulletSymbolChange(sym)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all font-[family-name:var(--font-caveat)] ${
                  bullet === sym
                    ? "text-white bg-[var(--terra)]"
                    : "text-[var(--terra)] bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-[var(--terra)]"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dotted grid */}
      <div className="rounded-xl px-7 py-6 min-h-[280px] bg-[var(--bg-surface)] border border-[var(--border-light)] bg-[size:18px_18px] bg-[radial-gradient(circle,_var(--bg-muted-tag)_1px,_transparent_1px)]">
        {items.map((item: ListItem, index: number) => (
          <div
            key={item.id}
            className={`group flex gap-3 items-start py-1.5 border-b border-[var(--border-light)] last:border-none transition-opacity ${draggingId === item.id ? "opacity-40" : ""}`}
            {...itemProps(index, item.id)}
          >
            <span className="cursor-grab active:cursor-grabbing text-[var(--fg-faint)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none mt-0.5">
              ⠿
            </span>
            {isChecklist ? (
              <button
                onClick={() => onToggleCheck(item.id, item.type)}
                className={`shrink-0 mt-1 w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-colors ${
                  item.type === "done"
                    ? "bg-[var(--terra)] border-[var(--terra)]"
                    : "border-[var(--terra)] bg-transparent"
                }`}
              >
                {item.type === "done" && (
                  <span className="text-white text-[9px] leading-none">✓</span>
                )}
              </button>
            ) : (
              <span className="shrink-0 text-[15px] w-5 mt-0.5 text-[var(--terra)]">
                {bullet}
              </span>
            )}
            <span
              className={`font-[family-name:var(--font-caveat)] text-base flex-1 leading-snug text-[var(--terra)] ${
                isChecklist && item.type === "done" ? "line-through opacity-45" : ""
              }`}
            >
              {item.title}
            </span>
            <button
              onClick={() => onRemove(item.id)}
              className="text-base text-[var(--fg-faint)] hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}

        {/* Inline add row */}
        <div className="flex gap-3 items-start py-1.5 opacity-40 focus-within:opacity-100 transition-opacity">
          {isChecklist ? (
            <span className="shrink-0 mt-1 w-4 h-4 rounded border-[1.5px] border-[var(--terra)]" />
          ) : (
            <span className="shrink-0 text-[15px] w-5 mt-0.5 text-[var(--fg-faint)]">
              {bullet}
            </span>
          )}
          <input
            ref={inlineRef}
            type="text"
            value={inlineText}
            onChange={(e) => setInlineText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={isChecklist ? "add an item…" : "add an idea…"}
            className="font-[family-name:var(--font-caveat)] text-base flex-1 bg-transparent border-none outline-none text-[var(--terra)] placeholder:text-[var(--terra)]"
          />
        </div>
      </div>
    </>
  );
}
