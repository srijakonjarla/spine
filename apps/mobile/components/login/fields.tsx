import { Pressable, Text, TextInput, View } from "react-native";
import { styles } from "./styles";
import { C } from "./tokens";

export function Divider({ label = "or with email" }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function EmailField({
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

export function PasswordField({
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

export function ConfirmPasswordField({
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

export function NameField({
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

export function UsernameField({
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

export function FooterLink({
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
