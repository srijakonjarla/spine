"use client";

import { COVER_COLORS, COVER_HEX } from "./coverConstants";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COVER_COLORS.map((c) => (
        <button
          type="button"
          key={c}
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full transition-transform hover:scale-110"
          style={{
            background: `var(--cover-${c}-from, ${COVER_HEX[c]})`,
            outline: value === c ? `2px solid var(--cover-${c}-from, ${COVER_HEX[c]})` : "none",
            outlineOffset: "2px",
          }}
        />
      ))}
    </div>
  );
}
