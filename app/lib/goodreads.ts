import type { BookEntry } from "@/types";

// Minimal RFC-4180 CSV parser that handles quoted fields with embedded commas/newlines
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 2;
      } else if (ch === '"') {
        inQuotes = false;
        i++;
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = "";
        i++;
      } else if (ch === '\r' && next === '\n') {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i += 2;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c.trim())).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
}

function goodreadsDateToISO(d: string): string {
  // Goodreads format: YYYY/MM/DD
  if (!d) return "";
  return d.replace(/\//g, "-");
}

function mapStatus(shelf: string): BookEntry["status"] {
  if (shelf === "read") return "finished";
  if (shelf === "currently-reading") return "reading";
  return "want-to-read";
}

const DNF_SHELVES = new Set(["did-not-finish", "dnf", "abandoned", "gave-up", "could-not-finish", "stopped", "unfinished"]);

// Goodreads system shelves that are status, not genres
const SYSTEM_SHELVES = new Set(["read", "currently-reading", "to-read", "reading", ...DNF_SHELVES]);

function parseGenres(bookshelves: string): string[] {
  if (!bookshelves.trim()) return [];
  return bookshelves
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && !SYSTEM_SHELVES.has(s));
}

function detectDNF(bookshelves: string): boolean {
  return bookshelves.split(",").map((s) => s.trim().toLowerCase()).some((s) => DNF_SHELVES.has(s));
}

export interface GoodreadsPreview {
  entry: BookEntry;
  originalShelf: string;
}

export function parseGoodreadsCSV(text: string): GoodreadsPreview[] {
  const rows = parseCSV(text);
  const now = new Date().toISOString();

  return rows.map((row) => {
    const rating = parseInt(row["My Rating"] ?? "0", 10) || 0;
    const shelf = row["Exclusive Shelf"] ?? "to-read";
    const bookshelves = row["Bookshelves"] ?? "";
    const dateRead = goodreadsDateToISO(row["Date Read"] ?? "");
    const dateAdded = goodreadsDateToISO(row["Date Added"] ?? "");
    const isDNF = detectDNF(bookshelves);
    const status = isDNF ? "did-not-finish" : mapStatus(shelf);

    const entry: BookEntry = {
      id: crypto.randomUUID(),
      title: row["Title"] ?? "",
      author: row["Author"] ?? "",
      genres: parseGenres(bookshelves),
      moodTags: [],
      status,
      dateStarted: "",
      dateFinished: isDNF ? "" : dateRead,
      dateShelved: isDNF ? dateRead : "",
      rating,
      feeling: row["My Review"] ?? "",
      thoughts: [],
      reads: [],
      bookmarked: false,
      createdAt: dateAdded ? `${dateAdded}T00:00:00.000Z` : now,
      updatedAt: now,
    };

    return { entry, originalShelf: shelf };
  }).filter((p) => p.entry.title);
}
