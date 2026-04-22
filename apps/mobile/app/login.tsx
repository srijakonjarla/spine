import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { SpineLogo } from "@/components/SpineLogo";

// ─── Brand palette ───────────────────────────────────────────────
const C = {
  plum: "#2d1b2e",
  plumDark: "#1c0e1e",
  terra: "#c97b5a",
  terraPressed: "#a04630",
  sage: "#7b9e87",
  gold: "#d4a843",
  cream: "#faf6f0",
  creamDark: "#f0eae0",
  fg: "#1a1a1a",
  fgMuted: "#5a5060",
  fgFaint: "#c4bfba",
  borderLight: "#e8e2da",
};

type Step = "email" | "method" | "password" | "signup" | "forgot";

export default function Login() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const goTo = (next: Step) => {
    setStep(next);
    setError("");
  };
  const goBack = () => {
    if (step === "method") goTo("email");
    else if (step === "password" || step === "forgot") goTo("method");
    else if (step === "signup") goTo("email");
  };

  async function handleSignIn() {
    if (!password || password.length < 8) {
      setError("password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/library");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sign-in failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace("/library");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "google sign-in failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleContinue() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    goTo("method");
  }

  const subtitle =
    step === "signup"
      ? "create your reading journal."
      : step === "forgot"
        ? "let\u2019s get you back in."
        : "sign in to continue your reading year.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Back button */}
          {step !== "email" && (
            <Pressable onPress={goBack} style={styles.backButton}>
              <Text style={styles.backText}>← back</Text>
            </Pressable>
          )}

          {/* Logo + Wordmark */}
          <SpineLogo size={48} variant="dark" />
          <Text style={styles.wordmark}>
            spine<Text style={styles.wordmarkDot}>.</Text>
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Email field */}
          {step === "email" || step === "signup" ? (
            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor={C.fgFaint}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoFocus={step === "email"}
              />
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <Text style={styles.staticValue}>{email}</Text>
            </View>
          )}

          {/* Password field */}
          {step === "password" && (
            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                placeholder="••••••••••"
                placeholderTextColor={C.fgFaint}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                autoFocus
              />
              <View style={styles.forgotRow}>
                <Pressable onPress={() => goTo("forgot")}>
                  <Text style={styles.linkText}>forgot?</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Error */}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* Step actions */}
          {step === "email" && (
            <View style={styles.actions}>
              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                ]}
              >
                <Text style={styles.ctaText}>continue →</Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={handleGoogleSignIn}
                disabled={busy}
                style={({ pressed }) => [
                  styles.googleBtn,
                  pressed && styles.googleBtnPressed,
                  busy && styles.ctaDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={C.fg} size="small" />
                ) : (
                  <Text style={styles.googleBtnText}>
                    continue with Google
                  </Text>
                )}
              </Pressable>

              <View style={styles.signupRow}>
                <Text style={styles.signupHint}>
                  don&apos;t have an account?{" "}
                </Text>
                <Pressable onPress={() => goTo("signup")}>
                  <Text style={[styles.linkText, { color: C.terra }]}>
                    start reading →
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === "method" && (
            <View style={styles.actions}>
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={busy}
                style={({ pressed }) => [
                  styles.googleBtn,
                  pressed && styles.googleBtnPressed,
                  busy && styles.ctaDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={C.fg} size="small" />
                ) : (
                  <Text style={styles.googleBtnText}>
                    continue with Google
                  </Text>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={() => goTo("password")}
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                ]}
              >
                <Text style={styles.ctaText}>sign in with password →</Text>
              </Pressable>
            </View>
          )}

          {step === "password" && (
            <View style={styles.actions}>
              <Pressable
                onPress={handleSignIn}
                disabled={busy}
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                  busy && styles.ctaDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={C.cream} size="small" />
                ) : (
                  <Text style={styles.ctaText}>open the book →</Text>
                )}
              </Pressable>
            </View>
          )}

          {step === "forgot" && (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                ]}
              >
                <Text style={styles.ctaText}>send reset link →</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 4,
  },

  // Back
  backButton: { marginBottom: 24 },
  backText: {
    fontSize: 13,
    color: C.fgMuted,
    letterSpacing: 0.3,
  },

  // Wordmark
  wordmark: {
    fontSize: 42,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  wordmarkDot: { color: C.terra },
  subtitle: {
    fontSize: 16,
    fontStyle: "italic",
    color: C.fgMuted,
    marginTop: 6,
    marginBottom: 36,
    lineHeight: 22,
  },

  // Fields
  field: { marginBottom: 20 },
  label: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1.4,
    color: C.fgMuted,
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
    color: C.fg,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  staticValue: {
    fontSize: 15,
    color: C.fg,
    paddingVertical: 10,
  },

  // Forgot
  forgotRow: { alignItems: "flex-end", marginTop: 6 },

  // Links
  linkText: {
    fontSize: 12,
    color: C.fgMuted,
    letterSpacing: 0.3,
  },

  // Error
  error: {
    fontSize: 13,
    color: "#c44",
    marginBottom: 4,
  },

  // Actions
  actions: { marginTop: 12, gap: 16 },
  cta: {
    backgroundColor: C.terra,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaPressed: { backgroundColor: C.terraPressed },

  // Google button
  googleBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.borderLight,
    backgroundColor: C.cream,
  },
  googleBtnPressed: { backgroundColor: C.creamDark },
  googleBtnText: {
    color: C.fg,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.borderLight,
  },
  dividerText: {
    fontSize: 12,
    color: C.fgFaint,
    letterSpacing: 0.3,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: {
    color: C.cream,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  // Signup hint
  signupRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  signupHint: {
    fontSize: 12,
    color: C.fgMuted,
    letterSpacing: 0.3,
  },
});
