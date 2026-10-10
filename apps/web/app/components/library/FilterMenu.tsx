"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CaretDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";

const menuItems = (menu: HTMLElement | null) =>
  Array.from(
    menu?.querySelectorAll<HTMLElement>(
      '[role="menuitemcheckbox"],[role="menuitemradio"]',
    ) ?? [],
  );

/**
 * Text-button trigger plus a popover menu, styled like the other library
 * controls. Closes on outside click, Escape, Tab, or via `close` passed to
 * children; arrow keys move between items.
 */
export function FilterMenu({
  id,
  label,
  active,
  icon,
  menuLabel,
  align = "left",
  children,
}: {
  id: string;
  label: ReactNode;
  active: boolean;
  icon?: ReactNode;
  menuLabel: string;
  align?: "left" | "right";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    const menu = menuRef.current;
    const all = menuItems(menu);
    (
      menu?.querySelector<HTMLElement>("[data-menu-autofocus]") ??
      all.find((el) => el.getAttribute("aria-checked") === "true") ??
      all[0]
    )?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const all = menuItems(menuRef.current);
      const i = all.indexOf(document.activeElement as HTMLElement);
      const step = e.key === "ArrowDown" ? 1 : -1;
      all[(i + step + all.length) % all.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-xs transition-colors ${active ? "text-terra font-medium" : "text-fg-faint hover:text-fg-muted"}`}
      >
        {icon}
        <span className="max-w-40 truncate">{label}</span>
        <CaretDownIcon
          size={10}
          weight="bold"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          role="menu"
          aria-label={menuLabel}
          onKeyDown={onKeyDown}
          className={`absolute top-full mt-2 z-20 min-w-48 max-w-64 p-1.5 bg-surface border border-line rounded-xl shadow-md ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

/** A row in a FilterMenu: checkbox (multi) or check mark (single). */
export function MenuItem({
  checked,
  multi = false,
  dimmed = false,
  onSelect,
  ariaLabel,
  trailing,
  children,
}: {
  checked: boolean;
  multi?: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  ariaLabel?: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role={multi ? "menuitemcheckbox" : "menuitemradio"}
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onSelect}
      className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left text-xs transition-colors outline-none hover:bg-plum-trace focus-visible:bg-plum-trace ${checked ? "bg-plum-trace text-fg font-medium" : "text-fg-muted"} ${dimmed && !checked ? "opacity-45" : ""}`}
    >
      {multi ? (
        <span
          className={`flex items-center justify-center w-3.5 h-3.5 shrink-0 rounded border transition-colors ${checked ? "bg-terra border-terra text-white" : "border-line"}`}
        >
          {checked && <CheckIcon size={9} weight="bold" />}
        </span>
      ) : (
        <span className="flex items-center justify-center w-3.5 shrink-0 text-terra">
          {checked && <CheckIcon size={11} weight="bold" />}
        </span>
      )}
      <span className="flex-1 min-w-0 truncate">{children}</span>
      {trailing}
    </button>
  );
}

/** Single-select menu with an optional "any" row that clears the value. */
export function SelectMenu<T extends string | number>({
  id,
  menuLabel,
  placeholder,
  value,
  options,
  onChange,
  align,
  clearable = true,
}: {
  id: string;
  menuLabel: string;
  /** Trigger text and "any" row label when nothing is selected */
  placeholder: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T | null) => void;
  align?: "left" | "right";
  clearable?: boolean;
}) {
  if (options.length === 0) return null;
  const selected = options.find((o) => o.value === value);
  return (
    <FilterMenu
      id={id}
      menuLabel={menuLabel}
      label={selected?.label ?? placeholder}
      active={clearable && value != null}
      align={align}
    >
      {(close) => (
        <OptionList
          options={options}
          isChecked={(v) => v === value}
          onSelect={(v) => {
            onChange(v);
            close();
          }}
          leading={
            clearable && (
              <MenuItem
                checked={value == null}
                onSelect={() => {
                  onChange(null);
                  close();
                }}
              >
                {placeholder}
              </MenuItem>
            )
          }
        />
      )}
    </FilterMenu>
  );
}

/** Multi-select menu; the menu stays open while toggling options. */
export function MultiSelectMenu<T extends string | number>({
  id,
  menuLabel,
  placeholder,
  value,
  options,
  onChange,
  align,
  searchable = false,
}: {
  id: string;
  menuLabel: string;
  /** Trigger text when nothing is selected */
  placeholder: string;
  value: T[];
  options: { value: T; label: string }[];
  onChange: (v: T[]) => void;
  align?: "left" | "right";
  /** Show a search box above the options */
  searchable?: boolean;
}) {
  if (options.length === 0) return null;
  const selected = options.filter((o) => value.includes(o.value));
  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0].label
        : `${selected[0].label} +${selected.length - 1}`;
  // Keep selections in option order so the trigger label is stable.
  const toggle = (v: T) =>
    onChange(
      value.includes(v)
        ? value.filter((x) => x !== v)
        : options
            .map((o) => o.value)
            .filter((x) => x === v || value.includes(x)),
    );

  return (
    <FilterMenu
      id={id}
      menuLabel={menuLabel}
      label={label}
      active={value.length > 0}
      align={align}
    >
      {() => (
        <OptionList
          multi
          options={options}
          searchable={searchable}
          isChecked={(v) => value.includes(v)}
          onSelect={toggle}
          footer={
            value.length > 0 && (
              <div className="mt-1 pt-1 border-t border-line">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="w-full px-2 py-1 text-left text-xs text-terra hover:underline"
                >
                  clear
                </button>
              </div>
            )
          }
        />
      )}
    </FilterMenu>
  );
}

// Its own component so the search query resets each time the menu opens.
function OptionList<T extends string | number>({
  options,
  multi = false,
  searchable = false,
  isChecked,
  onSelect,
  leading,
  footer,
}: {
  options: { value: T; label: string }[];
  multi?: boolean;
  searchable?: boolean;
  isChecked: (v: T) => boolean;
  onSelect: (v: T) => void;
  /** Row shown above the options when not searching */
  leading?: ReactNode;
  footer?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  return (
    <>
      {searchable && (
        <div className="flex items-center gap-2 px-2 pb-1.5 mb-1 border-b border-line">
          <MagnifyingGlassIcon size={12} className="shrink-0 text-fg-faint" />
          <input
            data-menu-autofocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && shown.length > 0) {
                e.preventDefault();
                onSelect(shown[0].value);
              }
            }}
            placeholder="search…"
            aria-label="search options"
            className="flex-1 min-w-0 py-1 bg-transparent text-xs text-fg placeholder:text-fg-faint outline-none"
          />
        </div>
      )}
      <div className="max-h-72 overflow-y-auto">
        {!q && leading}
        {shown.map((o) => (
          <MenuItem
            key={o.value}
            multi={multi}
            checked={isChecked(o.value)}
            onSelect={() => onSelect(o.value)}
          >
            {o.label}
          </MenuItem>
        ))}
        {shown.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-fg-faint">no matches.</p>
        )}
      </div>
      {footer}
    </>
  );
}
