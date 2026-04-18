// ─── Tab: Quotes ──────────────────────────────────────────────────

import { QuoteCard } from "@/components/QuoteCard";
import { toast } from "@/lib/toast";
import { getQuotes, addQuote, deleteQuote } from "@/lib/quotes";
import { Quote } from "@/types";
import { useState, useEffect } from "react";
import { useBook } from "@/providers/BookContext";

export default function QuotesTab() {
  const { entry: { id: bookId } } = useBook();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [input, setInput] = useState("");
  const [page, setPage] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getQuotes(bookId).then(setQuotes).catch(() => toast("Failed to load data. Please refresh."));
  }, [bookId]);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const q = await addQuote(text, bookId, page.trim());
      setQuotes((prev) => [q, ...prev]);
      setInput("");
      setPage("");
      setOpen(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="px-10 py-7 bg-cream">
      {/* Add quote toggle */}
      <div className="mb-5 flex justify-end">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`text-xs font-semibold font-sans rounded-full px-3.5 py-1.5 border-none cursor-pointer transition-colors ${
            open
              ? "text-ink-light bg-[var(--bg-plum-soft)]"
              : "text-terra bg-[var(--bg-terra-15)]"
          }`}
        >
          {open ? "cancel" : "+ add quote"}
        </button>
      </div>

      {open && (
        <div className="book-surface p-5 mb-6">
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="paste the quote..."
            rows={3}
            className="w-full bg-transparent border-none outline-none resize-none font-serif text-[15px] italic leading-[1.7] text-ink mb-3"
          />
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="p. 42 (optional)"
              className="focus:outline-none text-xs bg-transparent border-b border-[var(--border-light)] pb-0.5 text-ink-light font-sans w-[120px]"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim() || adding}
              className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
            >
              save quote
            </button>
          </div>
          <p className="hint-text">↵ to save · esc to cancel</p>
        </div>
      )}

      {quotes.length === 0 && !open && (
        <div className="text-center py-16">
          <p className="font-hand text-lg text-fg-faint">no quotes saved yet</p>
          <p className="text-[13px] text-fg-faint mt-1.5 font-sans">
            add your first underlined quote
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5">
        {quotes.map((q) => (
          <div key={q.id} className="book-surface px-6 py-5">
            <QuoteCard
              text={q.text}
              pageNumber={q.pageNumber}
              onDelete={() => {
                deleteQuote(q.id);
                setQuotes((prev) => prev.filter((x) => x.id !== q.id));
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
