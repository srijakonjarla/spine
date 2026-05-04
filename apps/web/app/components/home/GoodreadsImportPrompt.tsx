import Link from "next/link";

export function GoodreadsImportPrompt({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface border border-line rounded-2xl shadow-lg max-w-sm w-full mx-4 p-6 space-y-4">
        <h2 className="font-serif text-lg font-semibold text-fg-heading">
          welcome to spine
        </h2>
        <p className="text-sm text-fg-muted leading-relaxed">
          if you have a goodreads library, you can import all your books,
          ratings, and shelves in one go.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Link
            href="/profile"
            onClick={onDismiss}
            className="btn-primary text-caption"
          >
            import from goodreads
          </Link>
          <button
            onClick={onDismiss}
            className="text-caption text-fg-faint hover:text-fg-muted transition-colors"
          >
            skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
