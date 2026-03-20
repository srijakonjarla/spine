"use client";

import { useState, useEffect } from "react";

interface Props {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  className?: string;
}

export function EditableLabel({ value, placeholder, onSave, className = "" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onSave(draft.trim()); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") { setEditing(false); onSave(draft.trim()); }
        }}
        className={`bg-transparent border-b border-stone-300 outline-none ${className}`}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="click to rename"
      className={`hover:opacity-60 transition-opacity ${className}`}
    >
      {value || <span className="text-stone-300 italic">{placeholder}</span>}
    </button>
  );
}
