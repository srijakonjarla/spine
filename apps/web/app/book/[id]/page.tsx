"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  updateEntry,
  deleteEntry,
  startNewRead,
  deleteBookRead,
  logHistoricalRead,
  updateBookRead,
} from "@/lib/db";
import { useEntry } from "@/lib/hooks";
import { useQuotes } from "@/providers/QuotesProvider";
import { BookDetailSkeleton } from "@/components/book/BookDetailSkeleton";
import { Hero } from "@/components/book/Hero";
import { ReadSelector } from "@/components/book/ReadSelector";
import { TabBar } from "@/components/book/TabBar";
import { useBooks } from "@/providers/BooksProvider";
import type { BookEntry, ReadingStatus } from "@/types";
import { localDateStr } from "@/lib/dates";
import { toast } from "@/lib/toast";
import {
  ReflectionTab,
  TimelineTab,
  QuotesTab,
  DetailsTab,
} from "@/components/tabs";
import { TabId } from "@/lib/books";
import { BookContext } from "@/providers/BookContext";
import type { ReadPatch } from "@/providers/BookContext";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { updateBook, removeBook } = useBooks();

  const { data: entry, mutate: mutateEntry, isLoading } = useEntry(id);
  const { quotes: allQuotes } = useQuotes();
  const quotes = useMemo(
    () => allQuotes.filter((q) => q.bookId === id),
    [allQuotes, id],
  );

  const [activeTab, setActiveTab] = useState<TabId>("reflection");
  const [selectedReadId, setSelectedReadId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [rereadLoading, setRereadLoading] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Partial<BookEntry>>({});

  useEffect(() => {
    if (!isLoading && entry === null) router.replace("/");
  }, [isLoading, entry, router]);

  const save = useCallback(
    (patch: Partial<BookEntry>) => {
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = setTimeout(async () => {
        await updateEntry(id, pendingPatch.current);
        pendingPatch.current = {};
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      }, 600);
    },
    [id],
  );

  const update = useCallback(
    (patch: Partial<BookEntry>) => {
      mutateEntry(
        (prev) =>
          prev
            ? { ...prev, ...patch, updatedAt: new Date().toISOString() }
            : prev,
        { revalidate: false },
      );
      updateBook(id, patch);
      save(patch);
    },
    [id, save, updateBook, mutateEntry],
  );

  const handleStatusChange = (status: ReadingStatus) => {
    const patch: Partial<BookEntry> = { status };
    if (status === "reading" && entry && !entry.dateStarted)
      patch.dateStarted = localDateStr();
    if (status === "finished" && entry && !entry.dateFinished)
      patch.dateFinished = localDateStr();
    if (status === "did-not-finish" && entry && !entry.dateShelved)
      patch.dateShelved = localDateStr();
    update(patch);
  };

  const handleReread = async () => {
    if (!entry || rereadLoading) return;
    setRereadLoading(true);
    try {
      await startNewRead(entry);
      await mutateEntry();
    } finally {
      setRereadLoading(false);
    }
  };

  const handleDeleteRead = async (readId: string) => {
    if (!entry) return;
    await deleteBookRead(readId);
    mutateEntry(
      (prev) =>
        prev
          ? { ...prev, reads: prev.reads.filter((r) => r.id !== readId) }
          : prev,
      { revalidate: false },
    );
  };

  const handleUpdateRead = async (
    readId: string,
    patch: ReadPatch,
  ): Promise<void> => {
    if (!entry) return;
    await updateBookRead(entry.id, readId, patch);
    mutateEntry(
      (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reads: prev.reads.map((read) =>
            read.id === readId
              ? { ...read, ...patch, updatedAt: new Date().toISOString() }
              : read,
          ),
          updatedAt: new Date().toISOString(),
        };
      },
      { revalidate: false },
    );
  };

  const handleLogRead = async (
    read: Omit<ReadPatch, "status">,
  ): Promise<void> => {
    if (!entry) return;
    const newRead = await logHistoricalRead(entry.id, {
      ...read,
      status: "finished",
    });
    mutateEntry(
      (prev) => (prev ? { ...prev, reads: [...prev.reads, newRead] } : prev),
      { revalidate: false },
    );
  };

  const handleDelete = async () => {
    if (!entry) return;
    await deleteEntry(entry.id);
    removeBook(entry.id);
    router.back();
  };

  const viewedRead = useMemo(
    () =>
      selectedReadId && entry
        ? (entry.reads.find((r) => r.id === selectedReadId) ?? null)
        : null,
    [entry, selectedReadId],
  );

  const tabs = useMemo<{ id: TabId; label: string }[]>(
    () => [
      { id: "reflection", label: "Reflection" },
      { id: "timeline", label: "Timeline" },
      {
        id: "quotes",
        label: `Quotes${quotes.length ? ` · ${quotes.length}` : ""}`,
      },
      { id: "details", label: "Details" },
    ],
    [quotes.length],
  );

  if (!entry) return <BookDetailSkeleton />;

  const renderTabContent = () => {
    if (activeTab === "timeline") return <TimelineTab />;
    if (activeTab === "quotes") return <QuotesTab />;
    if (activeTab === "details") return <DetailsTab />;
    return <ReflectionTab />;
  };

  return (
    <BookContext.Provider
      value={{
        entry,
        quotes,
        activeTab,
        setActiveTab,
        selectedReadId,
        setSelectedReadId,
        onUpdate: update,
        onDeleteRead: handleDeleteRead,
        onUpdateRead: handleUpdateRead,
        onLogRead: handleLogRead,
        onReread: handleReread,
        rereadLoading,
        onDelete: handleDelete,
      }}
    >
      <div className="page" style={{ paddingBottom: 0 }}>
        <Hero
          entry={entry}
          quoteCount={quotes.length}
          saveState={saveState}
          viewedRead={viewedRead}
          rereadLoading={rereadLoading}
          onUpdate={update}
          onUpdateRead={handleUpdateRead}
          onStatusChange={handleStatusChange}
          onReread={handleReread}
        />
        <ReadSelector
          reads={entry.reads}
          selectedReadId={selectedReadId}
          onSelect={setSelectedReadId}
        />
        <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        {renderTabContent()}
      </div>
    </BookContext.Provider>
  );
}
