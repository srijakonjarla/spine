"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resetPassword } from "@/lib/auth";

type Stage = "exchanging" | "otp" | "form" | "done" | "error";

function ResetPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("exchanging");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseError, setSupabaseError] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
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

    // No code or hash — check for existing session, otherwise show OTP input
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStage("form");
      } else {
        setStage("otp");
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !otpCode.trim()) return;
    setError("");
    setOtpLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: "recovery",
    });
    if (error) {
      setOtpLoading(false);
      setError(error.message);
    } else {
      setStage("form");
    }
  };

  const handleResend = async (e: React.FormEvent) => {
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
    <div className="page flex items-center justify-center px-6">
      <div className="w-full max-w-sm font-mono">
        <div className="mb-10">
          <h1 className="page-title">spine</h1>
          <p className="text-xs text-stone-400 mt-0.5">your reading journal</p>
        </div>

        {stage === "exchanging" && (
          <p className="text-xs text-stone-400">verifying link...</p>
        )}

        {stage === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-xs text-stone-400 mb-6">
              enter the code from your reset email.
            </p>
            <div>
              <label
                htmlFor="otp-email"
                className="text-xs text-stone-400 block mb-1"
              >
                email
              </label>
              <input
                id="otp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="underline-input"
              />
            </div>
            <div>
              <label
                htmlFor="otp-code"
                className="text-xs text-stone-400 block mb-1"
              >
                reset code
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                required
                className="underline-input"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="pt-2 flex items-center gap-4">
              <button
                type="submit"
                disabled={otpLoading}
                className="btn-primary"
              >
                {otpLoading ? "..." : "verify code"}
              </button>
              <a href="/login" className="back-link">
                ← sign in
              </a>
            </div>
          </form>
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
        <div className="page flex items-center justify-center px-6">
          <p className="text-xs text-stone-400 font-mono">verifying link...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
