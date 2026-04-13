"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Stage = "exchanging" | "form" | "done" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>("exchanging");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStage("error");
      return;
    }
    supabase.auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) { setStage("error"); }
        else { setStage("form"); }
      });
  }, [searchParams]);

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
          <div className="space-y-4">
            <p className="text-xs text-red-400">this reset link is invalid or has expired.</p>
            <button onClick={() => router.push("/login")} className="back-link">
              ← back to sign in
            </button>
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
