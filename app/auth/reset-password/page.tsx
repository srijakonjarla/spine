"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resetPassword } from "@/lib/auth";

type Stage = "exchanging" | "form" | "done" | "error";

function ResetPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("exchanging");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseError, setSupabaseError] = useState("");
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      // PKCE flow — exchange code for session
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

    // Check hash fragment for implicit flow tokens
    const hash = window.location.hash.substring(1);
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

    // No code or hash — check for existing session, otherwise show error
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStage("form");
      } else {
        setStage("error");
      }
    });
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

    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setError(error.message);
    } else {
      await supabase.auth.signOut();
      window.location.href = "/login?reset=1";
    }
  };

  const handleResend = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    if (!email) return;
    setResendLoading(true);
    try {
      await resetPassword(email);
      setResendMessage("check your email for a new reset link.");
    } catch (err) {
      setResendMessage(
        err instanceof Error ? err.message : "something went wrong",
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-6 min-h-[calc(100dvh-var(--nav-height))] bg-page">
      <div className="w-full max-w-sm font-mono">
        <div className="mb-10">
          <h1 className="page-title">spine</h1>
          <p className="text-xs text-stone-400 mt-0.5">your reading journal</p>
        </div>

        {stage === "exchanging" && (
          <p className="text-xs text-stone-400">verifying link...</p>
        )}

        {stage === "error" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-red-400 mb-1">
                this reset link is invalid or has expired.
              </p>
              {supabaseError && (
                <p className="text-caption text-stone-400">{supabaseError}</p>
              )}
            </div>

            <form onSubmit={handleResend} className="space-y-3">
              <p className="text-xs text-stone-400">send a new link:</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="underline-input"
              />
              {resendMessage && (
                <p className="text-xs text-stone-500">{resendMessage}</p>
              )}
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="btn-primary"
                >
                  {resendLoading ? "..." : "resend link"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="back-link"
                >
                  ← sign in
                </button>
              </div>
            </form>
          </div>
        )}

        {stage === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-stone-400 mb-6">
              enter your new password.
            </p>
            <div>
              <label
                htmlFor="password"
                className="text-xs text-stone-400 block mb-1"
              >
                new password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
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
                {loading ? "..." : "update password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center px-6 min-h-[calc(100dvh-var(--nav-height))] bg-page">
          <p className="text-xs text-stone-400 font-mono">verifying link...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
