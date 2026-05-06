"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function InviteFriend() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  const handleInvite = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setError("");
    try {
      await apiFetch("/api/invite", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          message: message.trim(),
        }),
      });
      setState("sent");
      setEmail("");
      setMessage("");
      setTimeout(() => setState("idle"), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite.");
      setState("error");
    }
  };

  return (
    <form onSubmit={handleInvite} className="max-w-sm space-y-4">
      <p className="text-xs text-fg-faint">
        {
          "invite someone to join spine. they'll get an email with a link to create their account."
        }
      </p>
      <div>
        <label className="text-xs text-stone-400 block mb-1">their email</label>
        <input
          id="profile-invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          required
          className="underline-input w-full"
        />
      </div>
      <div>
        <label className="text-xs text-stone-400 block mb-1">
          a note (optional)
        </label>
        <input
          id="profile-invite-note"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="you have to try this!"
          maxLength={200}
          className="underline-input w-full"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={state === "sending" || !email.trim()}
          className="btn-primary"
        >
          {state === "sending" ? "sending..." : "send invite"}
        </button>
        {state === "sent" && (
          <span className="text-xs text-sage">invite sent!</span>
        )}
      </div>
    </form>
  );
}
