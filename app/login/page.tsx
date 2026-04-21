"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, signUp, sendMagicLink, resetPassword } from "@/lib/auth";

// Step 1: email → continue
// Step 2: method choice (magic link default, password option)
// Branches: password, signup, forgot
type Step = "email" | "method" | "password" | "signup" | "forgot";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const goBack = () => {
    if (step === "method") goTo("email");
    else if (step === "password" || step === "forgot") goTo("method");
    else if (step === "signup") goTo("email");
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        await signUp(email, password, name);
        setMessage("check your email to confirm your account.");
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
  }, [step]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      setStep("password");
      setMessage("password updated — sign in with your new password.");
    }
  }, []);

  return (
    <div className="pr-55 pb-14">
      <div className="flex items-center justify-center min-h-[calc(100dvh-var(--nav-height))] bg-page">
        <div className="w-full max-w-sm font-mono">
          {step !== "email" && (
            <button
              type="button"
              onClick={goBack}
              className="back-link mb-6 fade-up"
            >
              ← back
            </button>
          )}
          <div className="mb-10">
            <h1 className="page-title">spine</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              your reading journal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email input — editable on email & signup, static display on other steps */}
            {step === "email" || step === "signup" ? (
              <div>
                <label
                  htmlFor="email"
                  className="text-xs text-stone-400 block mb-1"
                >
                  email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus={step === "email"}
                  className="underline-input"
                />
              </div>
            ) : (
              <div className="fade-up">
                <p className="text-xs text-stone-400 mb-1">email</p>
                <p className="text-sm text-fg">{email}</p>
              </div>
            )}

            {/* Signup: name */}
            {step === "signup" && (
              <div className="fade-up">
                <label
                  htmlFor="name"
                  className="text-xs text-stone-400 block mb-1"
                >
                  name
                </label>
                <input
                  ref={nameRef}
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="srija"
                  required
                  className="underline-input"
                />
              </div>
            )}

            {/* Password — password & signup steps */}
            {(step === "password" || step === "signup") && (
              <div className="fade-up">
                <label
                  htmlFor="password"
                  className="text-xs text-stone-400 block mb-1"
                >
                  password
                </label>
                <input
                  ref={step === "password" ? passwordRef : undefined}
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

            {/* Step-specific actions */}
            <div className="pt-2 space-y-3">
              {step === "email" && (
                <>
                  <button type="submit" className="btn-primary">
                    continue
                  </button>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!email.trim()) {
                          setError("enter your email first");
                          return;
                        }
                        goTo("signup");
                      }}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      create account →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!email.trim()) {
                          setError("enter your email first");
                          return;
                        }
                        goTo("forgot");
                      }}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      forgot password?
                    </button>
                  </div>
                </>
              )}

              {step === "method" && (
                <div className="fade-up space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "..." : "sign in through magic link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo("password")}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors block"
                  >
                    use password instead →
                  </button>
                </div>
              )}

              {step === "password" && (
                <div className="fade-up">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "..." : "sign in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo("forgot")}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors block mt-3"
                  >
                    forgot password?
                  </button>
                </div>
              )}

              {step === "signup" && (
                <div className="fade-up">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "..." : "create account"}
                  </button>
                </div>
              )}

              {step === "forgot" && (
                <div className="fade-up">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "..." : "send reset link"}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
