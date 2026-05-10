import { cookies } from "next/headers";

/**
 * Returns today's "YYYY-MM-DD" in the user's IANA timezone (read from the
 * `tz` cookie set by <TimeZoneSync />). Falls back to UTC if the cookie is
 * missing or invalid — server runtimes are UTC, so plain Date.getDate()
 * would otherwise stamp tomorrow's date for late-night actions.
 */
export async function serverTodayLocal(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
