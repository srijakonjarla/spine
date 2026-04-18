"use client";

import Link from "next/link";
import type { BookList } from "@/types";
import {
  BooksIcon,
  LightbulbIcon,
  CheckSquareIcon,
  ListBulletsIcon,
  BookOpenIcon,
  TagIcon,
  type Icon,
} from "@phosphor-icons/react";
import { COVER_ICONS, coverGradientStyle } from "./coverConstants";

const LIST_TYPES: ReadonlyArray<{ value: string; icon: Icon; label: string; itemLabel: string }> =
  [
    { value: "book_list", icon: BooksIcon, label: "Book List", itemLabel: "books" },
    { value: "idea_list", icon: LightbulbIcon, label: "Idea List", itemLabel: "ideas" },
    { value: "checklist", icon: CheckSquareIcon, label: "Checklist", itemLabel: "items" },
    { value: "bullet_list", icon: ListBulletsIcon, label: "Bullet Points", itemLabel: "points" },
    { value: "library_loan", icon: BookOpenIcon, label: "Library Loans", itemLabel: "loans" },
    { value: "book_ledger", icon: TagIcon, label: "Book Ledger", itemLabel: "entries" },
  ];

function listTypeMeta(listType: string) {
  return LIST_TYPES.find((t) => t.value === listType) ?? LIST_TYPES[0];
}

interface ListCardProps {
  list: BookList;
  year: number;
}

export function ListCard({ list, year }: ListCardProps) {
  const isIdeaType = ["idea_list", "bullet_list"].includes(list.listType);
  const bullet = list.bulletSymbol || "→";
  const { icon: TypeIcon, label: typeLabel, itemLabel } = listTypeMeta(list.listType);
  const CoverIcon = COVER_ICONS[list.emoji] ?? BooksIcon;

  return (
    <Link
      href={`/${year}/lists/${list.id}`}
      className="block rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg border border-[var(--border-light)] bg-[var(--bg-surface)]"
    >
      {/* Cover */}
      <div
        className="h-24 px-4 py-3 flex flex-col justify-between relative"
        style={coverGradientStyle(list.color)}
      >
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full self-start text-white/80 bg-white/15 whitespace-nowrap">
          <TypeIcon size={10} />
          {typeLabel}
        </span>
        <CoverIcon size={26} className="text-white/90" />
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-4">
        <p className="font-serif text-[15px] font-bold leading-snug mb-0.5 text-[var(--fg-heading)]">
          {list.title}
        </p>
        <p className="font-[family-name:var(--font-caveat)] text-xs text-[var(--terra)] mb-2">
          {list.items.length} {itemLabel}
        </p>
        <div className="flex flex-col gap-0.5">
          {list.items.slice(0, 3).map((item) => (
            <p
              key={item.id}
              className="text-[11px] truncate text-[var(--fg-muted)]"
            >
              {isIdeaType && (
                <span className="text-[var(--terra)] mr-1">{bullet}</span>
              )}
              {item.title}
            </p>
          ))}
        </div>
      </div>
    </Link>
  );
}
