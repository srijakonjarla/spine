"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface RouteEntry {
  pathname: string;
  label: string;
}

function labelForPathname(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/library") return "library";
  if (pathname.startsWith("/library/")) {
    return pathname.split("/")[2].replace(/-/g, " ");
  }
  if (/^\/\d{4}\/books$/.test(pathname)) return "reading log";
  if (/^\/\d{4}\/spread$/.test(pathname)) return "monthly spread";
  if (/^\/\d{4}\/log$/.test(pathname)) return "journal entries";
  if (/^\/\d{4}\/log\//.test(pathname)) return "daily log";
  if (/^\/\d{4}\/quotes$/.test(pathname)) return "quote collection";
  if (/^\/\d{4}\/goal$/.test(pathname)) return "reading goal";
  if (/^\/\d{4}\/lists$/.test(pathname)) return "lists";
  if (/^\/\d{4}\/lists\//.test(pathname)) return "list";
  if (/^\/\d{4}\/habits$/.test(pathname)) return "habits";
  if (/^\/\d{4}\/stats$/.test(pathname)) return "year in review";
  if (/^\/\d{4}$/.test(pathname)) return pathname.slice(1); // year number
  return "back";
}

const NavigationContext = createContext<RouteEntry | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentRef = useRef<RouteEntry | null>(null);
  const [previous, setPrevious] = useState<RouteEntry | null>(null);

  useEffect(() => {
    // When pathname changes, the old current becomes the referrer
    setPrevious(currentRef.current);
    currentRef.current = { pathname, label: labelForPathname(pathname) };
  }, [pathname]);

  return (
    <NavigationContext.Provider value={previous}>
      {children}
    </NavigationContext.Provider>
  );
}

export function usePreviousRoute(): RouteEntry | null {
  return useContext(NavigationContext);
}
