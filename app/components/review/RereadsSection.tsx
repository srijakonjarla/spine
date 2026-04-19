import type { BookEntry } from "@/types";
import { formatDate } from "@/lib/dates";
import { BookListSection } from "./BookListSection";

interface RereadsSectionProps {
  rereads: BookEntry[];
  uniqueRereads: BookEntry[];
}

/** Re-reads list section — thin wrapper over BookListSection. */
export function RereadsSection({
  rereads,
  uniqueRereads,
}: RereadsSectionProps) {
  if (!uniqueRereads.length) return null;
  return (
    <BookListSection
      label={`re-reads · ${rereads.length}`}
      books={uniqueRereads}
      getMeta={(b) =>
        b.dateFinished
          ? formatDate(b.dateFinished, { month: "short", day: "numeric" })
          : undefined
      }
    />
  );
}
