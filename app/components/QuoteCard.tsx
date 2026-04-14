interface QuoteCardProps {
  text: string;
  bookTitle?: string;
  pageNumber?: string;
  onDelete?: () => void;
}

export function QuoteCard({ text, bookTitle, pageNumber, onDelete }: QuoteCardProps) {
  return (
    <div className="group border-l-2 border-[var(--border)] pl-4 hover:border-[var(--fg-faint)] transition-colors">
      <p className="text-sm italic leading-relaxed mb-2 text-[var(--fg)]">
        &ldquo;{text}&rdquo;
      </p>
      <div className="flex items-center gap-2 text-xs text-[var(--fg-faint)]">
        {bookTitle && <span>— {bookTitle}</span>}
        {pageNumber && <span>· p. {pageNumber}</span>}
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto text-[var(--fg-faint)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            delete
          </button>
        )}
      </div>
    </div>
  );
}
