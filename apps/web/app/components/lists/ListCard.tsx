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
import { listTypeMeta } from "@spine/shared";
import { COVER_ICONS, coverGradientStyle } from "./coverConstants";

// Map the shared list-type icon-name keys to Phosphor components.
const LIST_TYPE_ICONS: Record<string, Icon> = {
  Books: BooksIcon,
  Lightbulb: LightbulbIcon,
  CheckSquare: CheckSquareIcon,
  ListBullets: ListBulletsIcon,
  BookOpen: BookOpenIcon,
  Tag: TagIcon,
};

interface ListCardProps {
  list: BookList;
  year: number;
}

export function ListCard({ list, year }: ListCardProps) {
  const isIdeaType = ["idea_list", "bullet_list"].includes(list.listType);
  const bullet = list.bulletSymbol || "→";
  const {
    icon: typeIcon,
    label: typeLabel,
    itemLabel,
  } = listTypeMeta(list.listType);
  const TypeIcon = LIST_TYPE_ICONS[typeIcon] ?? BooksIcon;
  const CoverIcon = COVER_ICONS[list.emoji] ?? BooksIcon;

  return (
    <Link
      href={`/${year}/lists/${list.id}`}
      className="block rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg border border-line bg-surface"
    >
      {/* Cover */}
      <div
        className="h-24 px-4 py-3 flex flex-col justify-between relative"
        style={coverGradientStyle(list.color)}
      >
        <span className="flex items-center gap-1 text-label font-bold uppercase tracking-caps-wide px-2 py-0.5 rounded-full self-start text-white/80 bg-white/15 whitespace-nowrap">
          <TypeIcon size={10} />
          {typeLabel}
        </span>
        <CoverIcon size={26} className="text-white/90" />
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-4">
        <p className="font-serif text-body-md font-bold leading-snug mb-0.5 text-fg-heading">
          {list.title}
        </p>
        <p className="font-hand text-xs text-terra mb-2">
          {list.items.length} {itemLabel}
        </p>
        <div className="flex flex-col gap-0.5">
          {list.items.slice(0, 3).map((item) => (
            <p key={item.id} className="text-caption truncate text-fg-muted">
              {isIdeaType && <span className="text-terra mr-1">{bullet}</span>}
              {item.title}
            </p>
          ))}
        </div>
      </div>
    </Link>
  );
}
