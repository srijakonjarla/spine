interface QuoteCardProps {
  text: string;
  bookTitle?: string;
  pageNumber?: string;
  onDelete?: () => void;
}

export function QuoteCard({
  text,
  bookTitle,
  pageNumber,
  onDelete,
}: QuoteCardProps) {
  return (
    <div className="group border-l-2 border-edge pl-4 hover:border-fg-faint transition-colors">
      <p className="text-sm italic leading-relaxed mb-2 text-fg">
        &ldquo;{text}&rdquo;
      </p>
      <div className="flex items-center gap-2 text-xs text-fg-faint">
        {bookTitle && <span>— {bookTitle}</span>}
        {pageNumber && <span>· p. {pageNumber}</span>}
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto text-fg-faint hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            delete
          </button>
        )}
      </div>
    </div>
  );
}
