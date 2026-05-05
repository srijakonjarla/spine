"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ChooseUsernamePage() {
  return (
    <Suspense>
      <ChooseUsernameForm />
    </Suspense>
  );
}

function ChooseUsernameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    setError("");

    const trimmed = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
      setError(
        "username must be 3-30 characters: lowercase letters, numbers, and underscores.",
      );
      return;
    }

    setLoading(true);
    try {
      // Check availability via RPC first for a clear error message
      const { data: available } = await supabase.rpc("is_username_available", {
        p_username: trimmed,
      });
      if (!available) {
        throw new Error("that username is already taken.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: trimmed })
        .eq("id", user.id);

      if (updateError) {
        if (
          updateError.message.includes("duplicate") ||
          updateError.message.includes("unique")
        ) {
          throw new Error("that username is already taken.");
        }
        if (updateError.message.includes("username_format")) {
          throw new Error(
            "username must be 3-30 characters: lowercase letters, numbers, and underscores.",
          );
        }
        throw updateError;
      }

      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-dvh bg-page px-6">
      <div className="w-full max-w-sm">
        <span
          className="font-serif font-bold inline-block"
          style={{
            fontSize: 38,
            color: "var(--plum)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          spine<span className="text-terra">.</span>
        </span>

        <div
          className="font-serif italic"
          style={{
            fontSize: 16,
            color: "var(--fg-muted)",
            marginTop: 8,
            marginBottom: 40,
          }}
        >
          one last thing — choose a username.
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col"
          style={{ gap: 18 }}
        >
          <div>
            <label className="login-label">username</label>
            <input
              id="auth-choose-username"
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              placeholder="your_username"
              maxLength={30}
              required
              autoFocus
              className="login-input"
            />
            <p
              className="mt-1"
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.04em",
              }}
            >
              3-30 chars, lowercase letters, numbers, underscores
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="login-cta terra">
            {loading ? "..." : "continue →"}
          </button>
        </form>
      </div>
    </div>
  );
}
