"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut, getDisplayName } from "@/lib/auth";
import { useTheme } from "@/providers/ThemeProvider";
import { apiFetch } from "@/lib/api";
import type { User } from "@supabase/supabase-js";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { Section } from "@/components/profile/Section";
import { GoodreadsImport } from "@/components/profile/GoodreadsImport";
import { EnrichLibrary } from "@/components/profile/EnrichLibrary";
import { InviteFriend } from "@/components/profile/InviteFriend";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setName(getDisplayName(data.user ?? { email: "" }));
      if (data.user) {
        supabase
          .from("profiles")
          .select("username")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.username) setUsername(profile.username);
          });
      }
      setLoading(false);
    });
  }, []);

  const handleSaveProfile = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSaving(true);
    setNameMsg("");
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: name.trim(), custom_name: name.trim() },
      });
      if (authError) throw authError;

      const trimmedUsername = username.trim().toLowerCase();
      const profileUpdate: Record<string, string> = { name: name.trim() };
      if (trimmedUsername) {
        profileUpdate.username = trimmedUsername;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user!.id);
      if (profileError) {
        if (profileError.message.includes("username_format")) {
          throw new Error(
            "username must be 3-30 characters, lowercase letters, numbers, and underscores only.",
          );
        }
        if (
          profileError.message.includes("duplicate") ||
          profileError.message.includes("unique")
        ) {
          throw new Error("that username is already taken.");
        }
        throw profileError;
      }
      setNameMsg("saved.");
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : "failed to save.");
    } finally {
      setNameSaving(false);
      setTimeout(() => setNameMsg(""), 4000);
    }
  };

  const handleChangePassword = async (
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    e.preventDefault();
    setPwError("");
    setPwMsg("");
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setPwMsg("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(""), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="page">
      <div className="page-content">
        <div className="mb-10 pb-8 border-b border-stone-200">
          <h1 className="font-serif text-3xl font-semibold text-fg-heading tracking-tight">
            profile & settings
          </h1>
          {user?.email && (
            <p className="text-xs text-stone-400 mt-2">{user.email}</p>
          )}
        </div>

        {/* ── Profile ── */}
        <Section title="profile">
          <form onSubmit={handleSaveProfile} className="max-w-sm space-y-4">
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                display name
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="underline-input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                username
              </label>
              <input
                id="profile-username"
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
                placeholder="your_username"
                maxLength={30}
                className="underline-input w-full"
              />
              <p className="hint-text">
                3-30 characters, lowercase letters, numbers, and underscores.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={nameSaving}
                className="btn-primary"
              >
                {nameSaving ? "saving..." : "save"}
              </button>
              {nameMsg && (
                <span className="text-xs text-stone-400">{nameMsg}</span>
              )}
            </div>
          </form>
        </Section>

        {/* ── Password ── */}
        <Section title="change password">
          <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                new password
              </label>
              <input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="underline-input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                confirm new password
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="underline-input w-full"
              />
            </div>
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={pwSaving || !newPassword}
                className="btn-primary"
              >
                {pwSaving ? "updating..." : "update password"}
              </button>
              {pwMsg && <span className="text-xs text-stone-400">{pwMsg}</span>}
            </div>
          </form>
        </Section>

        {/* ── Appearance ── */}
        <Section title="appearance">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-stone-400 mb-3">theme</p>
              <div className="flex gap-2">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      if (theme !== t) toggle();
                    }}
                    className={`text-xs px-4 py-2 rounded-full border transition-colors ${
                      theme === t
                        ? "bg-plum text-white border-plum"
                        : "text-stone-500 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {t === "light" ? "☀ light" : "◑ dark"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Goodreads import ── */}
        <Section title="import from goodreads">
          {user && <GoodreadsImport />}
        </Section>

        {/* ── Enrich library ── */}
        <Section title="enrich library metadata">
          <EnrichLibrary />
        </Section>

        {/* ── Invite ── */}
        <Section title="invite a friend">
          <InviteFriend />
        </Section>

        {/* ── Account ── */}
        <Section title="account">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-stone-400 mb-1">signed in as</p>
              <p className="text-sm text-stone-700">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-stone-500 border border-stone-200 px-4 py-2 rounded-full hover:border-stone-400 hover:text-stone-800 transition-colors"
            >
              sign out
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
