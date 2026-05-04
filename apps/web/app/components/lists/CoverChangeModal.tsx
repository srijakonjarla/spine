"use client";

import { useState } from "react";
import { BooksIcon } from "@phosphor-icons/react";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";
import { COVER_ICONS, coverGradientStyle } from "./coverConstants";

interface CoverChangeModalProps {
  initialColor: string;
  initialEmoji: string;
  onClose: () => void;
  onSave: (color: string, emoji: string) => Promise<void>;
}

export function CoverChangeModal({
  initialColor,
  initialEmoji,
  onClose,
  onSave,
}: CoverChangeModalProps) {
  const [color, setColor] = useState(initialColor);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(color, emoji);
    } finally {
      setSaving(false);
    }
  };

  const PreviewIcon = COVER_ICONS[emoji] ?? BooksIcon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-100 rounded-2xl p-6 shadow-2xl bg-surface border border-line">
        <h3 className="font-serif text-lg font-bold text-fg-heading mb-1">
          Change cover
        </h3>
        <p className="font-hand text-note text-fg-muted mb-5">
          pick a new color and icon
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="section-label block mb-2">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="mb-5">
            <label className="section-label block mb-2">Icon</label>
            <IconPicker value={emoji} onChange={setEmoji} />
          </div>

          {/* Preview */}
          <div
            className="h-14 rounded-xl overflow-hidden flex items-end px-3 pb-2 mb-5"
            style={coverGradientStyle(color)}
          >
            <PreviewIcon size={22} className="text-white/90" />
          </div>

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
              disabled={saving}
              className="text-note font-semibold px-5 py-2 rounded-full text-white bg-plum hover:bg-plum-light transition-colors disabled:opacity-40"
            >
              {saving ? "saving…" : "save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
