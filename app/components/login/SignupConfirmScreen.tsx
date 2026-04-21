"use client";

import { useState, useEffect } from "react";
import { resendConfirmation } from "@/lib/auth";

interface SignupConfirmScreenProps {
  email: string;
  onBackToSignIn: () => void;
}

export function SignupConfirmScreen({
  email,
  onBackToSignIn,
}: SignupConfirmScreenProps) {
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    setResending(true);
    setError("");
    setMessage("");
    try {
      await resendConfirmation(email);
      setMessage("confirmation email resent.");
      setCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "failed to resend");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fade-up" style={{ marginTop: -8 }}>
      <p className="text-[15px] text-fg" style={{ lineHeight: 1.6 }}>
        check your email to confirm your account.
        <br />
        <span className="text-fg-muted text-[13px]">
          check your spam folder if you don&apos;t see it in your inbox.
        </span>
      </p>

      <div className="flex items-center gap-4 mt-6">
        <button
          type="button"
          disabled={resending || cooldown > 0}
          onClick={handleResend}
          className="login-cta terra"
        >
          {resending
            ? "sending..."
            : cooldown > 0
              ? `resend in ${cooldown}s`
              : "resend email"}
        </button>
        <button type="button" onClick={onBackToSignIn} className="login-link">
          back to sign in
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      {message && (
        <p className="text-xs mt-3" style={{ color: "var(--fg-muted)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
