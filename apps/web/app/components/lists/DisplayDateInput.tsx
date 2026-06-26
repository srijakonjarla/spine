"use client";

import { useRef } from "react";
import { formatDate } from "@/lib/dates";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Date field that displays the value in the canonical "Jan 15, 2025" format
 * (matching mobile) and opens the browser's native date picker on click.
 */
export function DisplayDateInput({
  id,
  value,
  onChange,
  className = "",
  placeholder = "pick date",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`text-left bg-transparent border-none outline-none cursor-pointer ${className}`}
      >
        {value ? formatDate(value) : placeholder}
      </button>
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}
