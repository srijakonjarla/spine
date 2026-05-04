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
  FoldShadow,
  FormCover,
  GoldSeal,
  GoogleButton,
  LandingCover,
  loginColors as C,
  loginStyles as styles,
} from "@/components/login";

type Step = "landing" | "login" | "signup" | "username" | "forgot";

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
  forgot: { pre: "forgot your", accent: "password", post: "?" },
};

export default function Login() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const { height: screenHeight } = useWindowDimensions();

  const [step, setStep] = useState<Step>("landing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const coverHeight = step === "landing" ? Math.round(screenHeight * 0.6) : 220;

  const goTo = (next: Step) => {
    setStep(next);
    setError("");
  };

  const goBack = () => {
    if (step === "forgot") goTo("login");
    else if (step === "username") goTo("signup");
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

  function handleClaimHandle() {
    if (!username.trim()) {
      setError("please choose a username");
      return;
    }
    Alert.alert("welcome", `account creation coming soon, @${username}.`);
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

  async function handleGoogleSignIn() {
    setBusy(true);
    setError("");
    try {
      const ok = await signInWithGoogle();
      if (ok) router.replace("/(tabs)");
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
                  style={({ pressed }) => [
                    styles.ctaTerra,
                    pressed && styles.ctaTerraPressed,
                  ]}
                >
                  <Text style={styles.ctaTerraText}>claim your shelf →</Text>
                </Pressable>
              </View>
            )}

            {step === "forgot" && (
              <View style={styles.formBlock}>
                <EmailField email={email} setEmail={setEmail} autoFocus />
                <Pressable
                  style={({ pressed }) => [
                    styles.ctaTerra,
                    pressed && styles.ctaTerraPressed,
                  ]}
                >
                  <Text style={styles.ctaTerraText}>send reset link →</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or with email</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function EmailField({
  email,
  setEmail,
  autoFocus,
}: {
  email: string;
  setEmail: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>email</Text>
      <TextInput
        placeholder="you@example.com"
        placeholderTextColor={C.fgFaint}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.inputBoxed}
        autoFocus={autoFocus}
      />
    </View>
  );
}

function PasswordField({
  password,
  setPassword,
  onForgot,
  placeholder = "••••••••••",
}: {
  password: string;
  setPassword: (v: string) => void;
  onForgot?: () => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>password</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={C.fgFaint}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.inputBoxed}
      />
      {onForgot && (
        <View style={styles.forgotRow}>
          <Pressable onPress={onForgot} hitSlop={8}>
            <Text style={styles.forgotText}>forgot password?</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ConfirmPasswordField({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>confirm password</Text>
      <TextInput
        placeholder="re-enter password"
        placeholderTextColor={C.fgFaint}
        secureTextEntry
        value={value}
        onChangeText={setValue}
        style={styles.inputBoxed}
      />
    </View>
  );
}

function NameField({
  name,
  setName,
  autoFocus,
}: {
  name: string;
  setName: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>your name</Text>
      <TextInput
        placeholder="srija"
        placeholderTextColor={C.fgFaint}
        autoCapitalize="words"
        autoComplete="name"
        autoCorrect={false}
        value={name}
        onChangeText={setName}
        style={styles.inputBoxed}
        autoFocus={autoFocus}
      />
    </View>
  );
}

function UsernameField({
  username,
  setUsername,
  autoFocus,
}: {
  username: string;
  setUsername: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>username</Text>
      <TextInput
        placeholder="your_handle"
        placeholderTextColor={C.fgFaint}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        value={username}
        onChangeText={(v) =>
          setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))
        }
        maxLength={30}
        style={styles.inputBoxed}
        autoFocus={autoFocus}
      />
      <Text
        style={{
          fontSize: 11,
          color: C.fgMuted,
          letterSpacing: 0.2,
          marginTop: 6,
        }}
      >
        3–30 chars, lowercase letters, numbers, underscores.
      </Text>
    </View>
  );
}

function FooterLink({
  prompt,
  cta,
  onPress,
}: {
  prompt: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.footerLinkCenter} hitSlop={8}>
      <Text style={styles.footerHint}>
        {prompt} <Text style={styles.footerHintAccent}>{cta}</Text>
      </Text>
    </Pressable>
  );
}
