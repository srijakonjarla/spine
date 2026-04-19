import { useState } from "react";
import { CatalogEntry } from "@/lib/catalog";
import { toast } from "@/lib/toast";
import { CatalogSearch } from "../CatalogSearch";

export default function InlineAdd({
  placeholder,
  onAdd,
  libraryEntries,
}: {
  placeholder: string;
  onAdd: (catalog?: CatalogEntry, raw?: string) => Promise<void>;
  libraryEntries?: import("@/types").BookEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  const handleAdd = async (catalog?: CatalogEntry) => {
    if (adding) return;
    setAdding(true);
    try {
      await onAdd(catalog, value);
      setValue("");
      setOpen(false);
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-fg-faint hover:text-fg-muted transition-colors mt-2"
      >
        + add
      </button>
    );
  }

  return (
    <div className="mt-2">
      <CatalogSearch
        value={value}
        onChange={setValue}
        onSelect={handleAdd}
        onSubmit={() => handleAdd()}
        placeholder={placeholder}
        disabled={adding}
        libraryEntries={libraryEntries}
      />
      {value.trim() && !adding && (
        <p className="hint-text">↵ to add · esc to cancel</p>
      )}
    </div>
  );
}
