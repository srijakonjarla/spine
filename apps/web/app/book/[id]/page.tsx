"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getEntry,
  updateEntry,
  deleteEntry,
  startNewRead,
  deleteBookRead,
  logHistoricalRead,
  updateBookRead,
} from "@/lib/db";
import { getQuotes } from "@/lib/quotes";
import { BookDetailSkeleton } from "@/components/book/BookDetailSkeleton";
import { Hero } from "@/components/book/Hero";
import { ReadSelector } from "@/components/book/ReadSelector";
import { TabBar } from "@/components/book/TabBar";
import type { BookEntry, ReadingStatus, Quote } from "@/types";
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

  const [entry, setEntry] = useState<BookEntry | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("reflection");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedReadId, setSelectedReadId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [rereadLoading, setRereadLoading] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Partial<BookEntry>>({});

  useEffect(() => {
    getEntry(id).then((found) => {
      if (!found) {
        router.replace("/");
        return;
      }
      setEntry(found);
    });
  }, [id, router]);

  useEffect(() => {
    getQuotes(id)
      .then(setQuotes)
      .catch(() => toast("Failed to load data. Please refresh."));
  }, [id]);

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
      setEntry((prev) =>
        prev
          ? { ...prev, ...patch, updatedAt: new Date().toISOString() }
          : prev,
      );
      save(patch);
    },
    [save],
  );

  const handleStatusChange = (status: ReadingStatus) => {
    const patch: Partial<BookEntry> = { status };
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
      const refreshed = await getEntry(id);
      if (refreshed) setEntry(refreshed);
    } finally {
      setRereadLoading(false);
    }
  };

  const handleDeleteRead = async (readId: string) => {
    if (!entry) return;
    await deleteBookRead(readId);
    setEntry((prev) =>
      prev
        ? { ...prev, reads: prev.reads.filter((r) => r.id !== readId) }
        : prev,
    );
  };

  const handleUpdateRead = async (
    readId: string,
    patch: ReadPatch,
  ): Promise<void> => {
    if (!entry) return;
    await updateBookRead(entry.id, readId, patch);
    setEntry((prev) => {
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
    });
  };

  const handleLogRead = async (
    read: Omit<ReadPatch, "status">,
  ): Promise<void> => {
    if (!entry) return;
    const newRead = await logHistoricalRead(entry.id, {
      ...read,
      status: "finished",
    });
    setEntry((prev) =>
      prev ? { ...prev, reads: [...prev.reads, newRead] } : prev,
    );
  };

  const handleDelete = async () => {
    if (!entry) return;
    await deleteEntry(entry.id);
    router.back();
  };

  if (!entry) return <BookDetailSkeleton />;

  const viewedRead = selectedReadId
    ? (entry.reads.find((r) => r.id === selectedReadId) ?? null)
    : null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "reflection", label: "Reflection" },
    { id: "timeline", label: "Timeline" },
    {
      id: "quotes",
      label: `Quotes${quotes.length ? ` · ${quotes.length}` : ""}`,
    },
    { id: "details", label: "Details" },
  ];

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
          onUpdate={update}
          onUpdateRead={handleUpdateRead}
          onStatusChange={handleStatusChange}
        />
        <ReadSelector
          reads={entry.reads}
          selectedReadId={selectedReadId}
          rereadLoading={rereadLoading}
          onSelect={setSelectedReadId}
          onReread={handleReread}
        />
        <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        {renderTabContent()}
      </div>
    </BookContext.Provider>
  );
}
