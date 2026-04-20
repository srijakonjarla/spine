"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function resolveTheme(): Theme {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "dark" || current === "light") return current;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved: Theme = prefersDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", resolved);
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with undefined — only resolve after mount to avoid SSR mismatch
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    // Syncing React state with the DOM theme set by the anti-FOUC script.
    // Synchronous setState on mount is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolveTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme: theme ?? "light", toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
