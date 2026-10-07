import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { UsernameField, loginStyles as ls } from "@/components/login";
import { C, SERIF } from "@/components/login/tokens";
import { claimUsername } from "@/lib/account";
import { useAuth } from "@/lib/auth";

export default function ChooseUsernameScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      await claimUsername(username);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={s.wordmark}>
          spine<Text style={{ color: C.terra }}>.</Text>
        </Text>
        <Text style={s.subtitle}>pick a username for your shelf.</Text>
        <View style={ls.formBlock}>
          <UsernameField
            username={username}
            setUsername={setUsername}
            autoFocus
          />
          {!!error && <Text style={ls.error}>{error}</Text>}
          <Pressable
            onPress={handleSubmit}
            disabled={busy || !username.trim()}
            style={({ pressed }) => [
              ls.ctaTerra,
              pressed && ls.ctaTerraPressed,
              (busy || !username.trim()) && ls.disabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={C.cream} />
            ) : (
              <Text style={ls.ctaTerraText}>claim your shelf →</Text>
            )}
          </Pressable>
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace("/login");
            }}
            style={ls.linkRow}
            hitSlop={8}
          >
            <Text style={ls.linkRowText}>use a different account</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  wordmark: {
    fontFamily: SERIF,
    fontSize: 38,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 16,
    color: C.fgMuted,
    marginTop: 8,
    marginBottom: 32,
  },
});
