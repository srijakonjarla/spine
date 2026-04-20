"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

type Stage = "confirm" | "exchanging" | "form" | "done" | "error";

function AcceptInviteForm() {
  const [stage, setStage] = useState<Stage>("exchanging");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseError, setSupabaseError] = useState("");

  useEffect(() => {
    const rawHash = window.location.hash.substring(1);
    // Decode in case Go's template engine URL-encoded the fragment
    const hash = rawHash ? decodeURIComponent(rawHash) : "";

    // Check for errors in hash fragment (e.g. #error=access_denied&error_description=...)
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const hashError =
        hashParams.get("error_description") || hashParams.get("error");
      if (hashError) {
        setSupabaseError(hashError.replace(/\+/g, " "));
        setStage("error");
        return;
      }

      // Email link flow: hash contains the Supabase verify URL.
      // We show a button instead of auto-redirecting, so email security
      // scanners (Proofpoint, etc.) can't consume the one-time token.
      if (hash.startsWith("https://")) {
        setVerifyUrl(hash);
        setStage("confirm");
        return;
      }

      // Implicit flow redirect: Supabase returned tokens in the hash
      // (e.g. #access_token=...&refresh_token=...). Set the session
      // explicitly to avoid race conditions with onAuthStateChange.
      const hashParams2 = new URLSearchParams(hash);
      const accessToken = hashParams2.get("access_token");
      const refreshToken = hashParams2.get("refresh_token");
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

    // Fallback: check if there's already an active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStage("form");
      } else {
        setStage("error");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
      data: { name: name.trim() },
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
    <div className="page flex items-center justify-center px-6">
      <div className="w-full max-w-sm font-mono">
        <div className="mb-10">
          <h1 className="page-title">spine</h1>
          <p className="text-xs text-stone-400 mt-0.5">your reading journal</p>
        </div>

        {stage === "confirm" && (
          <div className="space-y-6">
            <p className="text-xs text-stone-400">
              you've been invited to spine. tap below to accept and set up your
              account.
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
            <a href="/login" className="back-link">
              ← go to sign in
            </a>
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
              you're in. redirecting to your library...
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
        <div className="page flex items-center justify-center px-6">
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
