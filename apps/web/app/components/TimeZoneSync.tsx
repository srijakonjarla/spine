"use client";

import { useEffect } from "react";

/**
 * Writes the user's IANA timezone to a `tz` cookie on mount so server-side
 * code (autoLog, reading-log writes) can compute "today" in the user's local
 * tz instead of UTC. Vercel runs in UTC, so without this an evening-PT action
 * stamps tomorrow's date.
 */
export function TimeZoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=${oneYear}; samesite=lax`;
  }, []);
  return null;
}
