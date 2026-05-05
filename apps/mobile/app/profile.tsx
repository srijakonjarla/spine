import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { C, SERIF } from "@/components/login/tokens";
import { homeStyles as s } from "@/components/home";

function displayNameFromUser(
  user:
    | {
        email?: string;
        user_metadata?: { name?: string; full_name?: string };
      }
    | null
    | undefined,
): string {
  const meta = user?.user_metadata;
  return meta?.name ?? meta?.full_name ?? user?.email?.split("@")[0] ?? "";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={local.section}>
      <Text style={local.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={local.field}>
      <Text style={local.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={local.hint}>{hint}</Text> : null}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        local.primaryBtn,
        pressed && { backgroundColor: C.terraPressed },
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      <Text style={local.primaryBtnText}>{busy ? "saving…" : label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const user = session?.user;
  const userId = user?.id;
  const email = user?.email;

  const [name, setName] = useState(displayNameFromUser(user));
  const [username, setUsername] = useState("");
  const [loadingUsername, setLoadingUsername] = useState(true);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoadingUsername(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.username) setUsername(data.username);
        setLoadingUsername(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!name.trim() || !userId) return;
    setNameSaving(true);
    setNameMsg("");
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: name.trim(), custom_name: name.trim() },
      });
      if (authError) throw authError;

      const trimmedUsername = username.trim().toLowerCase();
      const profileUpdate: Record<string, string> = { name: name.trim() };
      if (trimmedUsername) profileUpdate.username = trimmedUsername;
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userId);
      if (profileError) {
        if (profileError.message.includes("username_format")) {
          throw new Error(
            "username must be 3–30 chars: lowercase letters, numbers, and underscores.",
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

  const handleChangePassword = async () => {
    setPwError("");
    setPwMsg("");
    if (newPassword.length < 8) {
      setPwError("password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setPwMsg("password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : "failed to update password.",
      );
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(""), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.topBar}>
        <Pressable
          hitSlop={10}
          onPress={() => router.back()}
          style={local.backBtn}
        >
          <Text style={local.backText}>←</Text>
        </Pressable>
        <Text style={s.topWordmark}>
          spine<Text style={{ color: C.terra }}>.</Text>
        </Text>
        <View style={local.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={local.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={local.header}>
            <Text style={local.title}>profile & settings</Text>
            {email ? <Text style={local.email}>{email}</Text> : null}
          </View>

          <Section title="profile">
            <Field label="display name">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="your name"
                placeholderTextColor={C.fgFaint}
                autoCapitalize="words"
                autoCorrect={false}
                style={local.input}
              />
            </Field>
            <Field
              label="username"
              hint="3–30 chars, lowercase letters, numbers, underscores."
            >
              {loadingUsername ? (
                <ActivityIndicator
                  color={C.fgMuted}
                  style={{ alignSelf: "flex-start" }}
                />
              ) : (
                <TextInput
                  value={username}
                  onChangeText={(v) =>
                    setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  placeholder="your_username"
                  placeholderTextColor={C.fgFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  style={local.input}
                />
              )}
            </Field>
            <View style={local.actionRow}>
              <PrimaryButton
                label="save"
                onPress={handleSaveProfile}
                disabled={!name.trim()}
                busy={nameSaving}
              />
              {nameMsg ? <Text style={local.msg}>{nameMsg}</Text> : null}
            </View>
          </Section>

          <Section title="change password">
            <Field label="new password">
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={C.fgFaint}
                secureTextEntry
                style={local.input}
              />
            </Field>
            <Field label="confirm new password">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={C.fgFaint}
                secureTextEntry
                style={local.input}
              />
            </Field>
            {pwError ? <Text style={local.errorMsg}>{pwError}</Text> : null}
            <View style={local.actionRow}>
              <PrimaryButton
                label="update password"
                onPress={handleChangePassword}
                disabled={!newPassword}
                busy={pwSaving}
              />
              {pwMsg ? <Text style={local.msg}>{pwMsg}</Text> : null}
            </View>
          </Section>

          <Section title="import from goodreads">
            <Text style={local.pointerText}>
              goodreads import lives on the{" "}
              <Text style={local.pointerLink}>web app</Text>. export your
              library from goodreads (my books → export library), then upload
              the csv from your profile page on the web.
            </Text>
          </Section>

          <Section title="account">
            <Text style={local.fieldLabel}>signed in as</Text>
            <Text style={local.accountEmail}>{email}</Text>
            <View style={{ marginTop: 16 }}>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  local.signOutBtn,
                  pressed && { backgroundColor: C.paperDeep },
                ]}
              >
                <Text style={local.signOutText}>sign out</Text>
              </Pressable>
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 22, color: C.plum, fontFamily: SERIF },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    marginBottom: 24,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 28,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -0.8,
  },
  email: {
    fontSize: 12,
    color: C.fgMuted,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  section: {
    paddingBottom: 28,
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: C.fgMuted,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: C.fgMuted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    color: C.fg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  hint: {
    fontSize: 11,
    color: C.fgMuted,
    letterSpacing: 0.2,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: C.terraInk,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  primaryBtnText: {
    color: C.cream,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.4,
  },
  msg: { fontSize: 12, color: C.fgMuted, letterSpacing: 0.2 },
  errorMsg: { fontSize: 12, color: "#b03a2e", marginTop: 4 },
  accountEmail: { fontSize: 14, color: C.fgMid },
  signOutBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  signOutText: { color: C.fgMid, fontSize: 13, letterSpacing: 0.3 },
  pointerText: {
    fontSize: 13,
    color: C.fgMid,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  pointerLink: {
    color: C.terraInk,
    fontWeight: "500",
  },
});
