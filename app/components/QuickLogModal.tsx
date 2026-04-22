"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { BookCover } from "@/components/BookCover";
import { useBooks } from "@/providers/BooksProvider";
import { useQuotes } from "@/providers/QuotesProvider";
import { addThought } from "@/lib/db";
import { updateEntry } from "@/lib/db";
import { addQuote } from "@/lib/quotes";
import { localDateStr } from "@/lib/dates";
import { toast } from "@/lib/toast";
import type { BookEntry, Thought } from "@/types";

type Tab = "thought" | "quote" | "finished";

const TABS: { value: Tab; label: string }[] = [
  { value: "thought", label: "thoughts" },
  { value: "quote", label: "quote" },
  { value: "finished", label: "finished" },
];

interface QuickLogModalProps {
  onClose: () => void;
}

function getLatestPage(book: BookEntry): number {
  const withPages = book.thoughts
    .filter((t) => t.pageNumber != null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  return withPages.length > 0 ? withPages[0].pageNumber! : 0;
}

export function QuickLogModal({ onClose }: QuickLogModalProps) {
  const { books, loading, updateBook } = useBooks();
  const { addQuote: addQuoteToCache } = useQuotes();

  // Prefer books currently being read; fall back to all non-want-to-read books
  const readingBooks = books.filter((b) => b.status === "reading");
  const logBooks =
    readingBooks.length > 0
      ? readingBooks
      : books.filter((b) => b.status !== "want-to-read");

  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("thought");
  const [saving, setSaving] = useState(false);

  // Form state
  const [thoughtInput, setThoughtInput] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [quotePageInput, setQuotePageInput] = useState("");
  const [ratingInput, setRatingInput] = useState(0);

  // Select first reading book once books load
  useEffect(() => {
    if (!selectedBookId && logBooks.length > 0) {
      setSelectedBookId(logBooks[0].id);
    }
  }, [logBooks, selectedBookId]);

  const selectedBook = logBooks.find((b) => b.id === selectedBookId);

  function resetForm() {
    setThoughtInput("");
    setPageInput("");
    setQuoteText("");
    setQuotePageInput("");
    setRatingInput(0);
  }

  function handleBookChange(id: string) {
    setSelectedBookId(id);
    resetForm();
  }

  async function handleSubmit() {
    if (!selectedBook || saving) return;
    setSaving(true);

    try {
      switch (tab) {
        case "thought": {
          if (!thoughtInput.trim() && !pageInput.trim()) {
            toast("write something or enter a page number", "error");
            setSaving(false);
            return;
          }
          const page = pageInput.trim() ? parseInt(pageInput, 10) : null;
          if (pageInput.trim() && (!page || page < 1)) {
            toast("enter a valid page number", "error");
            setSaving(false);
            return;
          }
          const thought: Thought = {
            id: crypto.randomUUID(),
            text: thoughtInput.trim(),
            pageNumber: page,
            createdAt: new Date().toISOString(),
          };
          await addThought(selectedBook.id, thought);
          updateBook(selectedBook.id, {
            thoughts: [...selectedBook.thoughts, thought],
          });
          toast(page ? "page logged" : "thought added");
          break;
        }
        case "quote": {
          if (!quoteText.trim()) {
            toast("enter the quote text", "error");
            setSaving(false);
            return;
          }
          const q = await addQuote(
            quoteText.trim(),
            selectedBook.id,
            quotePageInput.trim() || undefined,
          );
          addQuoteToCache(q);
          toast("quote saved");
          break;
        }
        case "finished": {
          await updateEntry(selectedBook.id, {
            status: "finished",
            dateFinished: localDateStr(),
            rating: ratingInput,
          });
          updateBook(selectedBook.id, {
            status: "finished",
            dateFinished: localDateStr(),
            rating: ratingInput,
          });
          toast("marked as finished");
          break;
        }
      }
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || logBooks.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-lg rounded-2xl p-7 shadow-2xl bg-surface border border-line">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-hand text-sm text-terra italic">quick log</p>
              <h2 className="font-serif text-title font-bold text-fg-heading">
                log an entry
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-fg-muted hover:text-fg transition-colors"
            >
              <XIcon size={20} />
            </button>
          </div>
          {loading ? (
            <div className="py-4 flex justify-center">
              <span className="text-sm text-fg-muted">loading...</span>
            </div>
          ) : (
            <p className="text-sm text-fg-muted italic font-serif">
              you&apos;re not reading anything right now. add a book and start
              reading to log entries here.
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentPage = selectedBook ? getLatestPage(selectedBook) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl p-7 shadow-2xl bg-surface border border-line">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-hand text-sm text-terra italic">quick log</p>
            <h2 className="font-serif text-title font-bold text-fg-heading">
              log an entry
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Book selector / display */}
        <div className="rounded-xl bg-page border border-line p-4 mb-5">
          {logBooks.length === 1 && selectedBook ? (
            <div className="flex items-center gap-4">
              <BookCover
                coverUrl={selectedBook.coverUrl}
                title={selectedBook.title}
                author={selectedBook.author}
                className="w-12"
              />
              <div className="min-w-0">
                <p className="font-serif font-semibold text-fg-heading truncate">
                  {selectedBook.title}
                </p>
                <p className="text-xs text-fg-muted truncate">
                  {selectedBook.author}
                  {selectedBook.pageCount
                    ? ` · p. ${currentPage} / ${selectedBook.pageCount}`
                    : currentPage > 0
                      ? ` · p. ${currentPage}`
                      : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logBooks.map((book) => {
                const page = getLatestPage(book);
                const selected = book.id === selectedBookId;
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => handleBookChange(book.id)}
                    className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2 transition-colors ${
                      selected
                        ? "bg-plum/6 border border-plum/20"
                        : "hover:bg-hover border border-transparent"
                    }`}
                  >
                    <BookCover
                      coverUrl={book.coverUrl}
                      title={book.title}
                      author={book.author}
                      className="w-10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif font-semibold text-sm text-fg-heading truncate">
                        {book.title}
                      </p>
                      <p className="text-xs text-fg-muted truncate">
                        {book.author}
                        {book.pageCount
                          ? ` · p. ${page} / ${book.pageCount}`
                          : page > 0
                            ? ` · p. ${page}`
                            : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-colors ${
                tab === t.value
                  ? "bg-plum text-white border-plum"
                  : "bg-transparent text-fg-muted border-line hover:border-fg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-4">
          {tab === "thought" && (
            <>
              <div>
                <label className="section-label block mb-1.5">
                  up to page{" "}
                  <span className="normal-case font-normal opacity-60">
                    optional
                  </span>
                </label>
                <input
                  type="number"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder={
                    currentPage > 0 ? `e.g. ${currentPage + 30}` : "e.g. 50"
                  }
                  min={1}
                  max={selectedBook?.pageCount ?? undefined}
                  autoFocus
                  className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-fg outline-none focus:border-terra transition-colors placeholder:text-fg-faint"
                />
              </div>
              <div>
                <label className="section-label block mb-1.5">note</label>
                <textarea
                  value={thoughtInput}
                  onChange={(e) => setThoughtInput(e.target.value)}
                  placeholder="how's it going?"
                  rows={3}
                  className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-fg outline-none focus:border-terra transition-colors placeholder:text-fg-faint resize-y"
                />
              </div>
            </>
          )}

          {tab === "quote" && (
            <>
              <div>
                <label className="section-label block mb-1.5">quote</label>
                <textarea
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="paste or type a passage..."
                  rows={4}
                  autoFocus
                  className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-fg outline-none focus:border-terra transition-colors placeholder:text-fg-faint font-serif italic resize-y"
                />
              </div>
              <div>
                <label className="section-label block mb-1.5">
                  page{" "}
                  <span className="normal-case font-normal opacity-60">
                    optional
                  </span>
                </label>
                <input
                  type="text"
                  value={quotePageInput}
                  onChange={(e) => setQuotePageInput(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-fg outline-none focus:border-terra transition-colors placeholder:text-fg-faint"
                />
              </div>
            </>
          )}

          {tab === "finished" && (
            <div>
              <label className="section-label block mb-2">
                how would you rate it?
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setRatingInput(ratingInput === star ? 0 : star)
                    }
                    className={`text-2xl transition-colors ${
                      star <= ratingInput
                        ? "text-gold"
                        : "text-fg-faint/40 hover:text-gold/60"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-xs text-fg-muted mt-2 font-hand">
                this will mark the book as finished today.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="text-note px-5 py-2 rounded-full text-fg-muted border border-line hover:bg-hover transition-colors"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="text-note font-semibold px-5 py-2 rounded-full text-white bg-plum hover:bg-plum-light transition-colors disabled:opacity-40"
          >
            {saving ? "saving..." : "log entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
