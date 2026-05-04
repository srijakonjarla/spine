import type { BookEntry } from "@/types";
import { SectionLabel } from "./SectionLabel";
import { BookRow } from "./BookRow";

interface BookListSectionProps {
  label: string;
  books: BookEntry[];
  getMeta?: (b: BookEntry) => string | undefined;
}

/** Generic labeled list of BookRow entries. */
export function BookListSection({
  label,
  books,
  getMeta,
}: BookListSectionProps) {
  if (!books.length) return null;
  return (
    <div className="mb-14">
      <SectionLabel>{label}</SectionLabel>
      <div className="space-y-0.5">
        {books.map((b) => (
          <BookRow key={b.id} book={b} meta={getMeta?.(b)} />
        ))}
      </div>
    </div>
  );
}
