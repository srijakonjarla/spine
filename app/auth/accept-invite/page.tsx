"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

type Stage = "exchanging" | "form" | "done" | "error";

function AcceptInviteForm() {
  const [stage, setStage] = useState<Stage>("exchanging");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseError, setSupabaseError] = useState("");

  useEffect(() => {
    // Check for errors in hash fragment (e.g. #error=access_denied&error_description=...)
    const hash = window.location.hash.substring(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      if (hashError) {
        setSupabaseError(hashError.replace(/\+/g, " "));
        setStage("error");
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

    // Implicit flow fallback
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setStage("form");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStage("form");
    });

    const timeout = setTimeout(() => {
      setStage((s) => (s === "exchanging" ? "error" : s));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
