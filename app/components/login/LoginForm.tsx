"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signIn, signUp, sendMagicLink, resetPassword } from "@/lib/auth";
import { GoogleButton } from "./GoogleButton";
import { SignupConfirmScreen } from "./SignupConfirmScreen";

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
  }, [step]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed") === "1") {
      setMessage("email confirmed — sign in to get started.");
    } else if (params.get("error") === "confirmation") {
      setError("confirmation link expired or invalid. please try again.");
    } else if (params.get("reset") === "1") {
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
      data-theme="light"
      className="relative flex flex-col justify-center overflow-y-auto px-5 py-8 sm:px-8 sm:py-12 md:px-10 md:py-14 lg:px-14"
      style={{
        background: "#faf6f1",
        boxShadow: "inset 24px 0 48px -24px rgba(0,0,0,0.35)",
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

      {step === "email" && <GoogleButton />}

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
              {loading ? "..." : "open your journal →"}
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

      {step === "signup-confirm" && (
        <SignupConfirmScreen
          email={email}
          onBackToSignIn={() => goTo("email")}
        />
      )}

      <div
        className="mt-10 flex items-center justify-end gap-x-4 text-xs"
        style={{ color: "var(--fg-faint)" }}
      >
        <Link href="/terms" className="hover:text-fg-muted transition-colors">
          terms
        </Link>
        <Link href="/privacy" className="hover:text-fg-muted transition-colors">
          privacy
        </Link>
        <a
          href="mailto:hello@spinereads.com"
          className="hover:text-fg-muted transition-colors"
        >
          contact
        </a>
        <span>© 2026 spine</span>
      </div>
    </div>
  );
}
