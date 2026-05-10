import { localDateStr, type BookEntry } from "@spine/shared";
import type { CatalogEntry } from "./library";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Build a fresh `BookEntry` from a catalog match (or raw title fallback)
 * with the given starting status. Used by the inline-add flows on the
 * library tab and the want-to-read screen.
 */
export function makeEntry(
  status: "reading" | "want-to-read",
  catalog?: CatalogEntry,
  raw?: string,
): BookEntry | null {
  const title = (catalog?.title ?? raw ?? "").trim();
  if (!title) return null;
  const now = new Date();
  return {
    id: uuid(),
    catalogBookId: "",
    title: catalog?.title ?? title,
    author: catalog?.author ?? "",
    publisher: catalog?.publisher ?? "",
    releaseDate: catalog?.releaseDate ?? "",
    genres: catalog?.genres ?? [],
    userGenres: [],
    moodTags: [],
    diversityTags: catalog?.diversityTags ?? [],
    userDiversityTags: [],
    bookshelves: [],
    status,
    format: "",
    audioDurationMinutes: catalog?.audioDurationMinutes ?? null,
    dateStarted: status === "reading" ? localDateStr(now) : "",
    dateFinished: "",
    dateShelved: status === "want-to-read" ? localDateStr(now) : "",
    dateDnfed: "",
    rating: 0,
    feeling: "",
    thoughts: [],
    reads: [],
    bookmarked: false,
    upNext: false,
    coverUrl: catalog?.coverUrl ?? "",
    isbn: catalog?.isbn ?? "",
    pageCount: catalog?.pageCount ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
