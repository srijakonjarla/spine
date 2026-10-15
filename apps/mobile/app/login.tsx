import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth";
import {
  resendConfirmation,
  resetPassword,
  signUp,
  verifySignupOtp,
} from "@/lib/account";
import {
  ConfirmPasswordField,
  Divider,
  EmailField,
  FoldShadow,
  FooterLink,
  FormCover,
  GoldSeal,
  AppleButton,
  GoogleButton,
  LandingCover,
  NameField,
  PasswordField,
  UsernameField,
  loginColors as C,
  loginStyles as styles,
} from "@/components/login";

type Step = "landing" | "login" | "signup" | "username" | "confirm" | "forgot";

const OTP_LENGTH = 8;

const HEADLINES: Record<
  Exclude<Step, "landing">,
  { pre: string; accent: string; post: string; caption?: string }
> = {
  login: { pre: "sign in to", accent: "continue", post: " reading." },
  signup: {
    pre: "open a new",
    accent: "journal",
    post: ".",
    caption: "no inbox blasts. ever.",
  },
  username: { pre: "claim your", accent: "handle", post: "." },
  confirm: { pre: "check your", accent: "inbox", post: "." },
  forgot: { pre: "forgot your", accent: "password", post: "?" },
};

export default function Login() {
  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const { height: screenHeight } = useWindowDimensions();

  const [step, setStep] = useState<Step>("landing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const coverHeight = step === "landing" ? Math.round(screenHeight * 0.6) : 220;

  const goTo = (next: Step) => {
    setStep(next);
    setError("");
    setMessage("");
  };

  const goBack = () => {
    if (step === "forgot") goTo("login");
    else if (step === "username") goTo("signup");
    else if (step === "confirm") goTo("login");
    else goTo("landing");
  };

  function handleSignupStep1() {
    setError("");
    if (!name.trim()) {
      setError("please enter your name");
      return;
    }
    if (!email.trim()) {
      setError("please enter your email");
      return;
    }
    if (!password || password.length < 8) {
      setError("password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("passwords don’t match");
      return;
    }
    goTo("username");
  }

  async function handleClaimHandle() {
    if (!username.trim()) {
      setError("please choose a username");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signUp(email, password, name.trim(), username);
      setCode("");
      goTo("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign-up failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(otp: string) {
    if (otp.length !== OTP_LENGTH) {
      setError(`please enter the full ${OTP_LENGTH}-digit code`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await verifySignupOtp(email, otp);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await resendConfirmation(email);
      setCode("");
      setMessage("confirmation email resent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to resend");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot() {
    if (!email.trim()) {
      setError("please enter your email");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await resetPassword(email);
      setMessage(
        "check your email for a reset link. once you've set a new password, sign in here.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "couldn't send reset link.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    if (!email.trim()) {
      Alert.alert("missing email", "please enter your email address.");
      return;
    }
    if (!password || password.length < 8) {
      setError("password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAppleSignIn() {
    setBusy(true);
    setError("");
    try {
      const ok = await signInWithApple();
      // Same as Google: the index gate sends new users to pick a username.
      if (ok) router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "apple sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    setError("");
    try {
      const ok = await signInWithGoogle();
      // Route through the index gate so first-time Google users pick a username.
      if (ok) router.replace("/");
      // user cancelled — leave the form alone, no error
    } catch (e) {
      setError(e instanceof Error ? e.message : "google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      {step === "landing" ? (
        <LandingCover height={coverHeight} />
      ) : (
        <FormCover
          height={coverHeight}
          onBack={goBack}
          pre={HEADLINES[step].pre}
          accent={HEADLINES[step].accent}
          post={HEADLINES[step].post}
          caption={HEADLINES[step].caption}
        />
      )}

      <KeyboardAvoidingView
        style={styles.flapHost}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.flap}>
          <FoldShadow />
          <GoldSeal />

          <ScrollView
            contentContainerStyle={styles.flapContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === "landing" && (
              <>
                <Text style={styles.wordmark}>
                  spine<Text style={{ color: C.terra }}>.</Text>
                </Text>
                <Text style={styles.subtitle}>
                  a quiet place for the books you read.
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => goTo("signup")}
                    style={({ pressed }) => [
                      styles.ctaTerra,
                      pressed && styles.ctaTerraPressed,
                    ]}
                  >
                    <Text style={styles.ctaTerraText}>start reading →</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => goTo("login")}
                    style={styles.linkRow}
                    hitSlop={8}
                  >
                    <Text style={styles.linkRowText}>
                      i already have an account →
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {step === "login" && (
              <View style={styles.formBlock}>
                <AppleButton busy={busy} onPress={handleAppleSignIn} />
                <GoogleButton busy={busy} onPress={handleGoogleSignIn} />

                <Divider />

                <EmailField email={email} setEmail={setEmail} />
                <PasswordField
                  password={password}
                  setPassword={setPassword}
                  onForgot={() => goTo("forgot")}
                />

                {!!error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  onPress={handleSignIn}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.ctaTerra,
                    pressed && styles.ctaTerraPressed,
                    busy && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={C.cream} size="small" />
                  ) : (
                    <Text style={styles.ctaTerraText}>open the book →</Text>
                  )}
                </Pressable>

                <FooterLink
                  prompt="no account yet?"
                  cta="start reading →"
                  onPress={() => goTo("signup")}
                />
              </View>
            )}

            {step === "signup" && (
              <View style={styles.formBlock}>
                <AppleButton busy={busy} onPress={handleAppleSignIn} />
                <GoogleButton busy={busy} onPress={handleGoogleSignIn} />

                <Divider />

                <NameField name={name} setName={setName} />
                <EmailField email={email} setEmail={setEmail} />
                <PasswordField
                  password={password}
                  setPassword={setPassword}
                  placeholder="something memorable"
                />
                <ConfirmPasswordField
                  value={confirmPassword}
                  setValue={setConfirmPassword}
                />

                {!!error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  onPress={handleSignupStep1}
                  style={({ pressed }) => [
                    styles.ctaTerra,
                    pressed && styles.ctaTerraPressed,
                  ]}
                >
                  <Text style={styles.ctaTerraText}>begin reading →</Text>
                </Pressable>

                <Text style={styles.fineprint}>
                  by continuing you agree to the{" "}
                  <Text
                    style={styles.fineprintLink}
                    onPress={() => router.push("/terms")}
                  >
                    terms
                  </Text>{" "}
                  and{" "}
                  <Text
                    style={styles.fineprintLink}
                    onPress={() => router.push("/privacy")}
                  >
                    privacy
                  </Text>{" "}
                  notice.
                </Text>

                <View style={styles.signupFooter}>
                  <FooterLink
                    prompt="already a reader?"
                    cta="sign in"
                    onPress={() => goTo("login")}
                  />
                </View>
              </View>
            )}

            {step === "username" && (
              <View style={styles.formBlock}>
                <UsernameField
                  username={username}
                  setUsername={setUsername}
                  autoFocus
                />

                {!!error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  onPress={handleClaimHandle}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.ctaTerra,
                    pressed && styles.ctaTerraPressed,
                    busy && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={C.cream} />
                  ) : (
                    <Text style={styles.ctaTerraText}>claim your shelf →</Text>
                  )}
                </Pressable>
              </View>
            )}

            {step === "confirm" && (
              <View style={styles.formBlock}>
                <Text style={styles.footerHint}>
                  enter the {OTP_LENGTH}-digit code we sent to{" "}
                  <Text style={{ fontWeight: "600" }}>{email.trim()}</Text>.
                  check your spam folder if you don&apos;t see it.
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    const cleaned = v.replace(/\D/g, "").slice(0, OTP_LENGTH);
                    setCode(cleaned);
                    setError("");
                    if (cleaned.length === OTP_LENGTH && !busy)
                      void handleVerify(cleaned);
                  }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  autoFocus
                  placeholder={"0".repeat(OTP_LENGTH)}
                  placeholderTextColor={C.fgFaint}
                  style={[
                    styles.inputBoxed,
                    {
                      textAlign: "center",
                      letterSpacing: 8,
                      fontSize: 22,
                    },
                  ]}
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                {!!message && <Text style={styles.footerHint}>{message}</Text>}
                <Pressable
                  onPress={() => handleVerify(code)}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.ctaTerra,
                    pressed && styles.ctaTerraPressed,
                    busy && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={C.cream} />
                  ) : (
                    <Text style={styles.ctaTerraText}>confirm →</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleResend}
                  disabled={busy}
                  style={styles.linkRow}
                  hitSlop={8}
                >
                  <Text style={styles.linkRowText}>resend code</Text>
                </Pressable>
              </View>
            )}

            {step === "forgot" && (
              <View style={styles.formBlock}>
                <EmailField email={email} setEmail={setEmail} autoFocus />
                {!!error && <Text style={styles.error}>{error}</Text>}
                {!!message && <Text style={styles.footerHint}>{message}</Text>}
                <Pressable
                  onPress={handleForgot}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.ctaTerra,
                    pressed && styles.ctaTerraPressed,
                    busy && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={C.cream} />
                  ) : (
                    <Text style={styles.ctaTerraText}>send reset link →</Text>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
