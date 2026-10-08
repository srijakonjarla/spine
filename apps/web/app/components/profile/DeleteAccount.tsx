"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/auth";

const CONFIRM_WORD = "delete";

/** Permanently deletes the account after a type-to-confirm step. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (typed.trim().toLowerCase() !== CONFIRM_WORD || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      // Full reload so no cached library data outlives the account.
      window.location.replace("/");
    } catch {
      setError("couldn't delete your account — try again later.");
      setDeleting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-400 hover:text-red-600 transition-colors"
      >
        delete account
      </button>
    );
  }

  return (
    <div className="max-w-sm space-y-3 rounded-xl border border-red-200 p-4">
      <p className="text-sm text-fg">
        this permanently deletes your account and everything in it — books,
        notes, quotes, lists, goals. it can&apos;t be undone.
      </p>
      <label
        htmlFor="profile-delete-confirm"
        className="text-xs text-stone-400 block"
      >
        type &ldquo;{CONFIRM_WORD}&rdquo; to confirm
      </label>
      <input
        id="profile-delete-confirm"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="underline-input w-full"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-3 items-center">
        <button
          onClick={handleDelete}
          disabled={typed.trim().toLowerCase() !== CONFIRM_WORD || deleting}
          className="text-sm text-white bg-red-500 px-4 py-2 rounded-full hover:bg-red-600 transition-colors disabled:opacity-40"
        >
          {deleting ? "deleting…" : "delete forever"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError("");
          }}
          disabled={deleting}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
