"use client";

import { COVER_ICONS, COVER_ICON_NAMES } from "./coverConstants";

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COVER_ICON_NAMES.map((name) => {
        const IconComp = COVER_ICONS[name];
        return (
          <button
            type="button"
            key={name}
            onClick={() => onChange(name)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              value === name
                ? "bg-selected text-fg-heading"
                : "text-fg-muted hover:bg-subtle"
            }`}
          >
            <IconComp size={18} />
          </button>
        );
      })}
    </div>
  );
}
