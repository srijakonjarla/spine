export default function ShelfDivider({
  year,
  count,
}: {
  year: number;
  count: number;
}) {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="flex-1 h-px bg-[linear-gradient(90deg,transparent,var(--border-light))]" />
      <p className="font-[family-name:var(--font-playfair)] text-[17px] italic text-[var(--fg-heading)] shrink-0">
        {year}
        <span className="font-[family-name:var(--font-caveat)] text-sm font-normal not-italic ml-3 text-terra">
          · {count} {count === 1 ? "book" : "books"}
        </span>
      </p>
      <div className="flex-1 h-px bg-[linear-gradient(90deg,var(--border-light),transparent)]" />
    </div>
  );
}
