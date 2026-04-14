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
    // Read directly from window.location to avoid Next.js Suspense/SSR issues
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setSupabaseError("No reset code found in the URL.");
      setStage("error");
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setSupabaseError(error.message);
        setStage("error");
      } else {
        setStage("form");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("passwords don't match"); return; }
    if (password.length < 6) { setError("password must be at least 6 characters"); return; }

    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setError(error.message); }
    else { setStage("done"); }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setResendLoading(true);
    try {
      await resetPassword(email);
      setResendMessage("check your email for a new reset link.");
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setResendLoading(false);
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
          <p className="text-xs text-stone-400">verifying link...</p>
        )}

        {stage === "error" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-red-400 mb-1">this reset link is invalid or has expired.</p>
              {supabaseError && <p className="text-[11px] text-stone-400">{supabaseError}</p>}
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
              {resendMessage && <p className="text-xs text-stone-500">{resendMessage}</p>}
              <div className="flex items-center gap-4 pt-1">
                <button type="submit" disabled={resendLoading} className="btn-primary">
                  {resendLoading ? "..." : "resend link"}
                </button>
                <button type="button" onClick={() => router.push("/login")} className="back-link">
                  ← sign in
                </button>
              </div>
            </form>
          </div>
        )}

        {stage === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-stone-400 mb-6">enter your new password.</p>
            <div>
              <label htmlFor="password" className="text-xs text-stone-400 block mb-1">new password</label>
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
              <label htmlFor="confirm" className="text-xs text-stone-400 block mb-1">confirm password</label>
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

        {stage === "done" && (
          <div className="space-y-4">
            <p className="text-xs text-stone-500">password updated. you can now sign in.</p>
            <button onClick={() => router.push("/login")} className="btn-primary">
              sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="page flex items-center justify-center px-6"><p className="text-xs text-stone-400 font-mono">verifying link...</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
