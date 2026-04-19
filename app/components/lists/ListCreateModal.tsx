"use client";

import { useState } from "react";
import {
  BooksIcon,
  LightbulbIcon,
  CheckSquareIcon,
  ListBulletsIcon,
  BookOpenIcon,
  TagIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";
import { COVER_COLORS, COVER_ICON_NAMES } from "./coverConstants";

// List types where a user may have at most one per year. Enforced by a partial
// unique index on `lists(user_id, year, list_type)` in Postgres; mirrored here
// to disable the buttons when the user already has one.
const SINGLETON_TYPES = new Set(["library_loan", "book_ledger"]);

const LIST_TYPES: ReadonlyArray<{
  value: string;
  icon: Icon;
  label: string;
  desc: string;
}> = [
  {
    value: "book_list",
    icon: BooksIcon,
    label: "Book List",
    desc: "search and add books from the catalog",
  },
  {
    value: "idea_list",
    icon: LightbulbIcon,
    label: "Idea List",
    desc: "freeform writing on a dotted-grid page",
  },
  {
    value: "checklist",
    icon: CheckSquareIcon,
    label: "Checklist",
    desc: "items with checkboxes you can tick off",
  },
  {
    value: "bullet_list",
    icon: ListBulletsIcon,
    label: "Bullet Points",
    desc: "bullet points with custom symbols",
  },
  {
    value: "library_loan",
    icon: BookOpenIcon,
    label: "Library Loans",
    desc: "track books checked out from the library",
  },
  {
    value: "book_ledger",
    icon: TagIcon,
    label: "Book Ledger",
    desc: "log books bought and sold, with prices",
  },
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
  /** List types already present for this year — disables the corresponding buttons. */
  existingTypes?: string[];
}

export function ListCreateModal({
  onClose,
  onCreate,
  saving,
  existingTypes = [],
}: ListCreateModalProps) {
  const takenSingletons = new Set(
    existingTypes.filter((t) => SINGLETON_TYPES.has(t)),
  );
  const [name, setName] = useState("");
  const [listType, setListType] = useState<string>("book_list");
  const [color, setColor] = useState<string>(COVER_COLORS[0]);
  const [emoji, setEmoji] = useState(COVER_ICON_NAMES[0]);
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    await onCreate({
      name: name.trim(),
      listType,
      color,
      emoji,
      description: description.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-120 rounded-2xl p-7 shadow-2xl bg-surface border border-line">
        <h2 className="font-serif text-title font-bold text-fg-heading mb-0.5">
          Create a new list
        </h2>
        <p className="font-hand text-sm text-fg-muted mb-6">
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
            <div className="grid grid-cols-3 gap-2 mb-3">
              {LIST_TYPES.map((t) => {
                const disabled = takenSingletons.has(t.value);
                const selected = listType === t.value;
                return (
                  <button
                    type="button"
                    key={t.value}
                    disabled={disabled}
                    title={
                      disabled
                        ? `You already have a ${t.label.toLowerCase()} list for this year.`
                        : undefined
                    }
                    onClick={() => setListType(t.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-colors ${
                      selected
                        ? "border-plum bg-plum/6"
                        : "border-line hover:border-fg-muted"
                    } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line`}
                  >
                    <t.icon size={20} />
                    <span className="text-detail font-semibold leading-tight text-fg-muted">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-caption font-hand text-fg-muted">
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
              Description{" "}
              <span className="normal-case font-normal opacity-60">
                optional
              </span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="what's this list for?"
              className="underline-input font-hand text-body-md"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-note px-4 py-2 rounded-full text-fg-muted hover:bg-hover transition-colors"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="text-note font-semibold px-5 py-2 rounded-full text-white bg-plum hover:bg-plum-light transition-colors disabled:opacity-40"
            >
              {saving ? "creating…" : "create list →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
