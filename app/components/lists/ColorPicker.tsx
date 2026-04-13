"use client";

import { COVER_COLORS, type CoverColor } from "./coverConstants";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const SWATCH_CLASS: Record<CoverColor, string> = {
  plum: "bg-[var(--cover-plum-from)]",
  navy: "bg-[var(--cover-navy-from)]",
  forest: "bg-[var(--cover-forest-from)]",
  terra: "bg-[var(--cover-terra-from)]",
  ruby: "bg-[var(--cover-ruby-from)]",
  violet: "bg-[var(--cover-violet-from)]",
  gold: "bg-[var(--cover-gold-from)]",
  sage: "bg-[var(--cover-sage-from)]",
  lavender: "bg-[var(--cover-lavender-from)]",
  bark: "bg-[var(--cover-bark-from)]",
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COVER_COLORS.map((c) => (
        <button
          type="button"
          key={c}
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full transition-transform hover:scale-110 outline-offset-2 ${
            SWATCH_CLASS[c]
          } ${value === c ? "outline-2 outline-[var(--fg-heading)]" : "outline-none"}`}
        />
      ))}
    </div>
  );
}
