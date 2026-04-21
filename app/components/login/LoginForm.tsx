"use client";

import { useState, useEffect, useRef } from "react";
import {
  signIn,
  signUp,
  signInWithGoogle,
  sendMagicLink,
  resetPassword,
  resendConfirmation,
} from "@/lib/auth";

type Step =
  | "email"
  | "method"
  | "password"
  | "signup"
  | "signup-username"
  | "signup-confirm"
  | "forgot";

export function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const goTo = (next: Step) => {
    setStep(next);
    setError("");
    setMessage("");
  };

  const usernameRef = useRef<HTMLInputElement>(null);

  const goBack = () => {
    if (step === "method") goTo("email");
    else if (step === "password" || step === "forgot") goTo("method");
    else if (step === "signup") goTo("email");
    else if (step === "signup-username") goTo("signup");
  };

  const handleSubmit = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (step === "email") {
      if (!email.trim()) return;
      goTo("method");
      return;
    }

    setLoading(true);
    try {
      if (step === "method") {
        await sendMagicLink(email);
        setMessage("check your email for a sign-in link.");
      } else if (step === "password") {
        if (password.length < 8) {
          setError("password must be at least 8 characters");
          setLoading(false);
          return;
        }
        await signIn(email, password);
      } else if (step === "signup") {
        if (!name.trim()) {
          setError("please enter your name");
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError("password must be at least 8 characters");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("passwords don\u2019t match");
          setLoading(false);
          return;
        }
        goTo("signup-username");
        setLoading(false);
        return;
      } else if (step === "signup-username") {
        if (!username.trim()) {
          setError("please choose a username");
          setLoading(false);
          return;
        }
        await signUp(email, password, name, username);
        goTo("signup-confirm");
      } else if (step === "forgot") {
        await resetPassword(email);
        setMessage("check your email for a password reset link.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === "password") passwordRef.current?.focus();
    if (step === "signup") nameRef.current?.focus();
    if (step === "signup-username") usernameRef.current?.focus();
    if (step === "signup-confirm") setCooldown(60);
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      setStep("password");
      setMessage("password updated — sign in with your new password.");
    }
  }, []);

  const subtitle =
    step === "signup"
      ? "create your reading journal."
      : step === "signup-username"
        ? "pick a username for your shelf."
        : step === "signup-confirm"
          ? "one last thing."
          : step === "forgot"
            ? "let\u2019s get you back in."
            : "sign in to continue your reading year.";

  return (
    <div
      className="relative flex flex-col justify-center overflow-y-auto"
      style={{
        background: "var(--bg-page)",
        boxShadow: "inset 24px 0 48px -24px rgba(0,0,0,0.35)",
        padding: "56px 56px",
      }}
    >
      {/* fold line */}
      <div
        className="absolute top-0 left-0 bottom-0 hidden lg:block"
        style={{
          width: 1,
          background:
            "linear-gradient(to bottom, transparent, rgb(var(--ch-plum) / 0.18) 20%, rgb(var(--ch-plum) / 0.18) 80%, transparent)",
        }}
      />
      {/* gold seal */}
      <div
        className="absolute hidden lg:flex items-center justify-center font-serif font-bold"
        style={{
          top: 56,
          left: -18,
          width: 36,
          height: 36,
          background: "var(--gold)",
          borderRadius: "50%",
          boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
          fontSize: 20,
          color: "var(--plum)",
          lineHeight: 1,
        }}
      >
        s<span className="text-terra">.</span>
      </div>

      {/* back button */}
      {step !== "email" && step !== "signup-confirm" && (
        <button
          type="button"
          onClick={goBack}
          className="back-link mb-6 fade-up self-start"
        >
          ← back
        </button>
      )}

      {/* wordmark */}
      <span
        className="font-serif font-bold inline-block"
        style={{
          fontSize: 38,
          color: "var(--plum)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        spine<span className="text-terra">.</span>
      </span>

      {/* subtitle */}
      <div
        className="font-serif italic"
        style={{
          fontSize: 16,
          color: "var(--fg-muted)",
          marginTop: 8,
          marginBottom: 40,
        }}
      >
        {subtitle}
      </div>

      {/* Google button + divider — top of email step, like the design */}
      {step === "email" && (
        <div className="flex flex-col" style={{ gap: 18, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="login-alt"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.37-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            continue with google
          </button>

          <div className="login-divider">
            <div className="login-divider-line" />
            <span>or with email</span>
            <div className="login-divider-line" />
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col"
        style={{ gap: 18 }}
      >
        {/* Email — editable on email & signup, static on other steps, hidden on username/confirm */}
        {step !== "signup-username" &&
          step !== "signup-confirm" &&
          (step === "email" || step === "signup" ? (
            <div>
              <label className="login-label">email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus={step === "email"}
                className="login-input"
              />
            </div>
          ) : (
            <div className="fade-up">
              <p className="login-label">email</p>
              <p className="text-[15px] text-fg">{email}</p>
            </div>
          ))}

        {/* Signup: name */}
        {step === "signup" && (
          <div className="fade-up">
            <label className="login-label">name</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              required
              className="login-input"
            />
          </div>
        )}

        {/* Signup username — separate screen */}
        {step === "signup-username" && (
          <div className="fade-up">
            <label className="login-label">username</label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              placeholder="your_username"
              maxLength={30}
              required
              className="login-input"
            />
            <p
              className="mt-1"
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.04em",
              }}
            >
              3-30 chars, lowercase letters, numbers, underscores
            </p>
          </div>
        )}

        {/* Password — not shown on signup-username */}
        {(step === "password" || step === "signup") && (
          <div className="fade-up">
            <label className="login-label">password</label>
            <input
              ref={step === "password" ? passwordRef : undefined}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              className="login-input"
            />
            {step === "password" && (
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  onClick={() => goTo("forgot")}
                  className="login-link"
                >
                  forgot?
                </button>
              </div>
            )}
          </div>
        )}

        {/* Confirm password — signup only */}
        {step === "signup" && (
          <div className="fade-up">
            <label className="login-label">confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••"
              required
              className="login-input"
            />
          </div>
        )}

        {step !== "signup-confirm" && error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        {step !== "signup-confirm" && message && (
          <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
            {message}
          </p>
        )}

        {/* Step-specific actions */}
        {step === "email" && (
          <div className="flex flex-col" style={{ gap: 18, marginTop: 8 }}>
            <button type="submit" className="login-cta terra">
              continue →
            </button>

            <div className="mt-2">
              <span
                className="font-mono text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                don&apos;t have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => goTo("signup")}
                  className="login-link"
                  style={{
                    color: "var(--terra)",
                    borderBottomColor: "var(--terra)",
                  }}
                >
                  start reading →
                </button>
              </span>
            </div>
          </div>
        )}

        {step === "method" && (
          <div
            className="fade-up flex flex-col"
            style={{ gap: 18, marginTop: 8 }}
          >
            <button
              type="submit"
              disabled={loading}
              className="login-cta terra"
            >
              {loading ? "..." : "sign in through magic link →"}
            </button>
            <button
              type="button"
              onClick={() => goTo("password")}
              className="login-link block"
            >
              use password instead →
            </button>
          </div>
        )}

        {step === "password" && (
          <div className="fade-up" style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              className="login-cta terra"
            >
              {loading ? "..." : "open the book →"}
            </button>
          </div>
        )}

        {step === "signup" && (
          <div className="fade-up" style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              className="login-cta terra"
            >
              next →
            </button>
          </div>
        )}

        {step === "signup-username" && (
          <div className="fade-up" style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              className="login-cta terra"
            >
              {loading ? "..." : "create account →"}
            </button>
          </div>
        )}

        {step === "forgot" && (
          <div className="fade-up" style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              className="login-cta terra"
            >
              {loading ? "..." : "send reset link →"}
            </button>
          </div>
        )}
      </form>

      {/* Confirmation screen — after successful signup */}
      {step === "signup-confirm" && (
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
              onClick={async () => {
                setResending(true);
                setError("");
                setMessage("");
                try {
                  await resendConfirmation(email);
                  setMessage("confirmation email resent.");
                  setCooldown(60);
                } catch (err: unknown) {
                  setError(
                    err instanceof Error ? err.message : "failed to resend",
                  );
                } finally {
                  setResending(false);
                }
              }}
              className="login-cta terra"
            >
              {resending
                ? "sending..."
                : cooldown > 0
                  ? `resend in ${cooldown}s`
                  : "resend email"}
            </button>
            <button
              type="button"
              onClick={() => goTo("email")}
              className="login-link"
            >
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
      )}
    </div>
  );
}
