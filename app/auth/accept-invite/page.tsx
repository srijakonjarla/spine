"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Stage = "confirm" | "exchanging" | "form" | "done" | "error";

function parseHash() {
  if (typeof window === "undefined") return null;
  const rawHash = window.location.hash.substring(1);
  const hash = rawHash ? decodeURIComponent(rawHash) : "";
  if (!hash) return null;

  const hashParams = new URLSearchParams(hash);
  const hashError =
    hashParams.get("error_description") || hashParams.get("error");
  if (hashError) {
    return {
      stage: "error" as Stage,
      supabaseError: hashError.replace(/\+/g, " "),
    };
  }

  if (hash.startsWith("https://")) {
    return { stage: "confirm" as Stage, verifyUrl: hash };
  }

  return null;
}

function AcceptInviteForm() {
  const parsed = parseHash();

  const [stage, setStage] = useState<Stage>(parsed?.stage ?? "exchanging");
  const [verifyUrl] = useState(parsed?.verifyUrl ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseError, setSupabaseError] = useState(
    parsed?.supabaseError ?? "",
  );

  useEffect(() => {
    // Synchronous cases (error, confirm) are handled via initial state above.
    // This effect only runs the async session exchange paths.
    if (parsed) return;

    const rawHash = window.location.hash.substring(1);
    const hash = rawHash ? decodeURIComponent(rawHash) : "";

    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(({ error }) => {
            if (error) {
              setSupabaseError(error.message);
              setStage("error");
            } else {
              setStage("form");
            }
          });
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setSupabaseError(error.message);
          setStage("error");
        } else {
          setStage("form");
        }
      });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStage("form");
      } else {
        setStage("error");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("password must be at least 8 characters");
      return;
    }
    if (!name.trim()) {
      setError("please enter your name");
      return;
    }

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
      data: { name: name.trim(), custom_name: name.trim() },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
    } else {
      setStage("done");
      // Small delay so they see the welcome, then redirect
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  };

  return (
    <div className="flex items-center justify-center px-6 min-h-[calc(100dvh-var(--nav-height))] bg-page">
      <div className="w-full max-w-sm font-mono">
        <div className="mb-10">
          <h1 className="page-title">spine</h1>
          <p className="text-xs text-stone-400 mt-0.5">your reading journal</p>
        </div>

        {stage === "confirm" && (
          <div className="space-y-6">
            <p className="text-xs text-stone-400">
              you&apos;ve been invited to spine. tap below to accept and set up
              your account.
            </p>
            <button
              onClick={() => {
                window.location.href = verifyUrl;
              }}
              className="btn-primary"
            >
              accept invite
            </button>
          </div>
        )}

        {stage === "exchanging" && (
          <p className="text-xs text-stone-400">verifying invite...</p>
        )}

        {stage === "error" && (
          <div className="space-y-4">
            <p className="text-xs text-red-400">
              {supabaseError?.toLowerCase().includes("expired")
                ? "this invite link has expired. ask your friend to send a new one."
                : "this invite link is invalid or has expired."}
            </p>
            {supabaseError && (
              <p className="text-caption text-stone-400">{supabaseError}</p>
            )}
            <Link href="/" className="back-link">
              ← go to sign in
            </Link>
          </div>
        )}

        {stage === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-stone-400 mb-6">
              welcome to spine. set up your account to get started.
            </p>
            <div>
              <label
                htmlFor="name"
                className="text-xs text-stone-400 block mb-1"
              >
                your name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="maya"
                required
                autoFocus
                className="underline-input"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-xs text-stone-400 block mb-1"
              >
                password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="underline-input"
              />
            </div>
            <div>
              <label
                htmlFor="confirm"
                className="text-xs text-stone-400 block mb-1"
              >
                confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="underline-input"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "..." : "get started"}
              </button>
            </div>
          </form>
        )}

        {stage === "done" && (
          <div>
            <p className="text-xs text-stone-400">
              you&apos;re in. redirecting to your library...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center px-6 min-h-[calc(100dvh-var(--nav-height))] bg-page">
          <p className="text-xs text-stone-400 font-mono">
            verifying invite...
          </p>
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
