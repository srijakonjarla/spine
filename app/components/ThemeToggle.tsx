"use client";

import { useTheme } from "../providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "switch to light" : "switch to dark"}
      className="text-xs text-white/50 hover:text-white/80 transition-colors"
    >
      {theme === "dark" ? "○" : "◑"}
    </button>
  );
}
