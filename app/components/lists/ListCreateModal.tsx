"use client";

import { useState } from "react";
import { BooksIcon, LightbulbIcon, CheckSquareIcon, ListBulletsIcon } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";
import { COVER_COLORS, COVER_ICON_NAMES } from "./coverConstants";

const LIST_TYPES: ReadonlyArray<{ value: string; icon: Icon; label: string; desc: string }> = [
  { value: "book_list",   icon: BooksIcon,       label: "Book List",     desc: "search and add books from the catalog" },
  { value: "idea_list",   icon: LightbulbIcon,   label: "Idea List",     desc: "freeform writing on a dotted-grid page" },
  { value: "checklist",   icon: CheckSquareIcon, label: "Checklist",     desc: "items with checkboxes you can tick off" },
  { value: "bullet_list", icon: ListBulletsIcon, label: "Bullet Points", desc: "bullet points with custom symbols" },
];

interface ListCreateModalProps {
  onClose: () => void;
  onCreate: (opts: {
    name: string;
    listType: string;
    color: string;
    emoji: string;
    description: string;
  }) => Promise<void>;
  saving: boolean;
}

export function ListCreateModal({ onClose, onCreate, saving }: ListCreateModalProps) {
  const [name, setName] = useState("");
  const [listType, setListType] = useState<string>("book_list");
  const [color, setColor] = useState<string>(COVER_COLORS[0]);
  const [emoji, setEmoji] = useState(COVER_ICON_NAMES[0]);
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    await onCreate({ name: name.trim(), listType, color, emoji, description: description.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl p-7 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]"
      >
        <h2 className="font-serif text-[22px] font-bold text-[var(--fg-heading)] mb-0.5">Create a new list</h2>
        <p className="font-[family-name:var(--font-caveat)] text-[14px] text-[var(--fg-muted)] mb-6">
          name it, type it, color it — then fill it
        </p>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-5">
            <label className="section-label block mb-1.5">List name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. "Books about grief", "Ideas for next year"…`}
              className="underline-input italic placeholder:not-italic"
            />
          </div>

          {/* Type */}
          <div className="mb-5">
            <label className="section-label block mb-2">List type</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {LIST_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setListType(t.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-colors ${
                    listType === t.value
                      ? "border-[var(--plum)] bg-[var(--plum)]/6"
                      : "border-[var(--border-light)] hover:border-[var(--fg-muted)]"
                  }`}
                >
                  <t.icon size={20} />
                  <span className="text-[10px] font-semibold leading-tight text-[var(--fg-muted)]">{t.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] font-[family-name:var(--font-caveat)] text-[var(--fg-muted)]">
              {LIST_TYPES.find((t) => t.value === listType)?.desc}
            </p>
          </div>

          {/* Color */}
          <div className="mb-5">
            <label className="section-label block mb-2">Cover color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Icon */}
          <div className="mb-5">
            <label className="section-label block mb-2">Icon</label>
            <IconPicker value={emoji} onChange={setEmoji} />
          </div>

          {/* Description */}
          <div className="mb-7">
            <label className="section-label block mb-1.5">
              Description <span className="normal-case font-normal opacity-60">optional</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="what's this list for?"
              className="underline-input font-[family-name:var(--font-caveat)] text-[15px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] px-4 py-2 rounded-full text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="text-[13px] font-semibold px-5 py-2 rounded-full text-white bg-[var(--plum)] hover:bg-[var(--plum-light)] transition-colors disabled:opacity-40"
            >
              {saving ? "creating…" : "create list →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
