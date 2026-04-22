"use client";

import { useState, useEffect, useRef } from "react";
import { verifySignupOtp, resendConfirmation } from "@/lib/auth";

interface SignupConfirmScreenProps {
  email: string;
  onBackToSignIn: () => void;
}

const OTP_LENGTH = 8;

export function SignupConfirmScreen({
  email,
  onBackToSignIn,
}: SignupConfirmScreenProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setCode(cleaned);
    setError("");
  };

  const handleVerify = async (otp: string) => {
    if (otp.length !== OTP_LENGTH) {
      setError(`please enter the full ${OTP_LENGTH}-digit code`);
      return;
    }
    setVerifying(true);
    setError("");
    try {
      await verifySignupOtp(email, otp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "invalid code");
      setVerifying(false);
    }
  };

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (code.length === OTP_LENGTH && !verifying) {
      handleVerify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleResend = async () => {
    setResending(true);
    setError("");
    setMessage("");
    try {
      await resendConfirmation(email);
      setMessage("confirmation email resent.");
      setCooldown(60);
      setCode("");
      inputRef.current?.focus();
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
      </p>
      <p className="text-fg-muted text-[13px] mt-1">
        enter the verification code or click the link we sent to{" "}
        <span className="font-semibold">{email}</span>.
        <br />
        check your spam folder if you don&apos;t see it in your inbox.
      </p>

      {/* OTP input — single field with letter-spacing */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={OTP_LENGTH}
        value={code}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && code.length === OTP_LENGTH) {
            handleVerify(code);
          }
        }}
        disabled={verifying}
        placeholder="••••••••"
        className="mt-6 w-full font-mono text-xl tracking-[0.35em] rounded-lg border px-4 py-3 transition-colors focus:outline-none"
        style={{
          borderColor: error
            ? "var(--red, #ef4444)"
            : code
              ? "var(--plum)"
              : "rgb(var(--ch-plum) / 0.15)",
          background: code ? "rgb(var(--ch-plum) / 0.04)" : "transparent",
          color: "var(--fg)",
          maxWidth: 280,
        }}
      />

      {verifying && (
        <p className="text-xs mt-3" style={{ color: "var(--fg-muted)" }}>
          verifying...
        </p>
      )}

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      {message && (
        <p className="text-xs mt-3" style={{ color: "var(--fg-muted)" }}>
          {message}
        </p>
      )}

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
    </div>
  );
}
