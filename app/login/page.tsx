"use client";

import { useState, useEffect } from "react";
import { signIn, signUp, resetPassword } from "@/lib/auth";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await signUp(email, password, name);
        setMessage("check your email to confirm your account.");
      } else if (mode === "forgot") {
        await resetPassword(email);
        setMessage("check your email for a password reset link.");
      } else {
        await signIn(email, password);
        // AuthProvider handles redirect
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => { setMode(next); setError(""); setMessage(""); };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      setMessage("password updated — sign in with your new password.");
    }
  }, []);

  return (
    <div className="page flex items-center justify-center px-6">
      <div className="w-full max-w-sm font-mono">
        <div className="mb-10">
          <h1 className="page-title">spine</h1>
          <p className="text-xs text-stone-400 mt-0.5">your reading journal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="text-xs text-stone-400 block mb-1">name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="srija"
                required
                autoFocus
                className="underline-input"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-xs text-stone-400 block mb-1">email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus={mode !== "signup"}
              className="underline-input"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="text-xs text-stone-400 block mb-1">password</label>
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
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-stone-500">{message}</p>}

          <div className="pt-2 flex items-center gap-4">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "..." : mode === "signin" ? "sign in" : mode === "signup" ? "create account" : "send reset link"}
            </button>
            <button type="button" onClick={() => switchMode(mode === "signup" ? "signin" : "signup")} className="back-link">
              {mode === "signup" ? "← sign in" : "create account →"}
            </button>
          </div>

          {mode === "signin" && (
            <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
              forgot password?
            </button>
          )}
          {mode === "forgot" && (
            <button type="button" onClick={() => switchMode("signin")} className="back-link">
              ← back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
