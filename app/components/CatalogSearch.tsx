"use client";

import { useState, useCallback, useRef } from "react";
import { searchCatalog, type CatalogEntry } from "@/lib/catalog";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (entry: CatalogEntry) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showReleaseDate?: boolean;
}

export function CatalogSearch({
  id,
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder = "search...",
  disabled = false,
  className = "",
  showReleaseDate = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const [idx, setIdx] = useState(-1);
  const [searchError, setSearchError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((v: string) => {
    onChange(v);
    setIdx(-1);
    setSearchError(false);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    if (!v.trim()) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const results = await searchCatalog(v);
        setSuggestions(results);
      } catch (err) {
        console.error("[CatalogSearch] error:", err);
        setSearchError(true);
        setSuggestions([]);
      }
    }, 250);
  }, [onChange]);

  const commit = (entry?: CatalogEntry) => {
    if (entry) { onSelect(entry); setSuggestions([]); setIdx(-1); }
    else onSubmit?.();
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (suggestions.length > 0) {
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, suggestions.length - 1)); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, -1)); return; }
            if (e.key === "Escape") { setSuggestions([]); setIdx(-1); return; }
            if (e.key === "Enter" && idx >= 0) { e.preventDefault(); commit(suggestions[idx]); return; }
          }
          if (e.key === "Enter") commit();
        }}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder={placeholder}
        disabled={disabled}
        className="underline-input"
      />
      {searchError && (
        <p className="absolute left-0 right-0 top-full mt-1.5 text-[11px] text-[var(--fg-faint)] px-1">
          search unavailable
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-md overflow-hidden z-10">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              onMouseDown={() => commit(s)}
              className={`w-full text-left px-4 py-2.5 flex items-baseline gap-3 transition-colors ${i === idx ? "bg-[var(--bg-subtle)]" : "hover:bg-[var(--bg-faintest)]"}`}
            >
              <span className="text-sm text-[var(--fg)] truncate">{s.title}</span>
              {s.author && <span className="text-xs text-[var(--fg-muted)] shrink-0">{s.author}</span>}
              {showReleaseDate && s.releaseDate && <span className="text-xs text-[var(--fg-faint)] shrink-0 ml-auto">{s.releaseDate}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Minimal hook for when you need raw access to search state */
export function useCatalogSearch(delay = 250) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const [idx, setIdx] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((value: string) => {
    setInput(value);
    setIdx(-1);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        setSuggestions(await searchCatalog(value));
      } catch (err) {
        console.error("[CatalogSearch]", err);
        setSuggestions([]);
      }
    }, delay);
  }, [delay]);

  const clear = useCallback(() => { setInput(""); setSuggestions([]); setIdx(-1); }, []);

  return { input, suggestions, idx, setIdx, handleChange, clear, setSuggestions };
}
