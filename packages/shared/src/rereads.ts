import type { BookEntry, BookRead } from "./types";

// Re-read derivations shared by web's /library/rereads and mobile's
// library/rereads screen.

export interface ReadInstance {
  rating: number;
  status: string;
  dateFinished: string;
}

export type RatingTrend = "up" | "down" | "same" | "unknown";

/** Archived reads that count as a real read (not a DNF, has a date). */
export function validPastReads(entry: BookEntry): BookRead[] {
  return entry.reads.filter(
    (r) => r.status !== "did-not-finish" && (r.dateFinished || r.dateStarted),
  );
}

/** True when the book has been read before the current read. */
export function isReread(entry: BookEntry): boolean {
  return validPastReads(entry).length > 0;
}

/** All read instances for a book, chronologically (oldest → newest). */
export function readTimeline(entry: BookEntry): ReadInstance[] {
  const historical = [...validPastReads(entry)]
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
    .map((r) => ({
      rating: r.rating,
      status: r.status,
      dateFinished: r.dateFinished,
    }));
  return [
    ...historical,
    {
      rating: entry.rating,
      status: entry.status,
      dateFinished: entry.dateFinished,
    },
  ];
}

/** Total number of times this book has been read (including the current read). */
export function readCount(entry: BookEntry): number {
  return validPastReads(entry).length + 1;
}

export function ratingTrend(timeline: { rating: number }[]): RatingTrend {
  const rated = timeline.filter((r) => r.rating > 0);
  if (rated.length < 1) return "unknown";
  const first = rated[0].rating;
  const last = rated[rated.length - 1].rating;
  if (last > first) return "up";
  if (last < first) return "down";
  return "same";
}

/** One-line observation about how re-read ratings moved. */
export function rereadInsight(books: BookEntry[]): string | null {
  if (books.length < 2) return null;
  const trends = books.map((b) => ratingTrend(readTimeline(b)));
  const improved = trends.filter((t) => t === "up").length;
  const dropped = trends.filter((t) => t === "down").length;
  const same = trends.filter((t) => t === "same").length;
  const total = books.length;

  if (improved === total) {
    return `Every one of your ${total} re-reads earned a higher rating the second time. You're drawn back to books that keep giving.`;
  }
  if (dropped === total) {
    return `All ${total} re-reads scored lower on a second visit — but returning still meant something, or you wouldn't have picked them back up.`;
  }
  if (improved > dropped && improved > 0) {
    const droppedBook = books.find((_, i) => trends[i] === "down");
    if (droppedBook && dropped === 1) {
      return `${improved} of your ${total} re-reads scored higher the second time. The one that didn't — ${droppedBook.title} — changed meaning with the distance.`;
    }
    return `${improved} of your ${total} re-reads scored higher on a return visit. These books still had more to say.`;
  }
  if (same > 0 && improved === 0 && dropped === 0) {
    return `Your re-reads all landed exactly where they started — consistent taste, or books that simply hold their shape.`;
  }
  return `${total} books you've returned to. The first read is curiosity; the re-read is a conversation.`;
}
