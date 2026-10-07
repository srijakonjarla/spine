import {
  localDateStr,
  type BookEntry,
  type ReadingStatus,
} from "@spine/shared";
import type { CatalogEntry } from "./library";
import { uuid } from "./uuid";

/**
 * Build a fresh `BookEntry` from a catalog match (or raw title fallback)
 * with the given starting status. Used by the inline-add flows on the
 * library tab and the status shelf screens.
 */
export function makeEntry(
  status: ReadingStatus,
  catalog?: CatalogEntry,
  raw?: string,
): BookEntry | null {
  const title = (catalog?.title ?? raw ?? "").trim();
  if (!title) return null;
  const now = new Date();
  const today = localDateStr(now);
  return {
    id: uuid(),
    catalogBookId: "",
    hardcoverBookId: catalog?.hardcoverBookId ?? null,
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
    dateStarted: status === "reading" ? today : "",
    dateFinished: status === "finished" ? today : "",
    dateShelved: status === "want-to-read" ? today : "",
    dateDnfed: status === "did-not-finish" ? today : "",
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
