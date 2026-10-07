import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { C } from "@/components/login/tokens";
import { apiFetch } from "@/lib/api";

type State = "idle" | "sending" | "sent" | "error";

export function InviteFriend() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (state !== "sent") return;
    const t = setTimeout(() => setState("idle"), 4000);
    return () => clearTimeout(t);
  }, [state]);

  const handleInvite = async () => {
    if (!email.trim() || state === "sending") return;
    setState("sending");
    setError("");
    try {
      await apiFetch("/api/invite", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), message: message.trim() }),
      });
      setState("sent");
      setEmail("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to send invite.");
      setState("error");
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.copy}>
        invite someone to join spine. they&apos;ll get an email with a link to
        create their account.
      </Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="their email"
        placeholderTextColor={C.fgFaint}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={s.input}
      />
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="a note (optional)"
        placeholderTextColor={C.fgFaint}
        multiline
        style={[s.input, { minHeight: 60 }]}
      />
      {state === "sent" ? <Text style={s.ok}>invite sent.</Text> : null}
      {state === "error" ? <Text style={s.err}>{error}</Text> : null}
      <Pressable
        onPress={handleInvite}
        disabled={!email.trim() || state === "sending"}
        style={({ pressed }) => [
          s.btn,
          pressed && { backgroundColor: C.paperDeep },
          (!email.trim() || state === "sending") && { opacity: 0.5 },
        ]}
      >
        <Text style={s.btnText}>
          {state === "sending" ? "sending…" : "send invite"}
        </Text>
      </Pressable>
    </View>
  );
}

export const profileWidgetStyles = StyleSheet.create({
  copy: { fontSize: 12, lineHeight: 18, color: C.fgMuted },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.fg,
    backgroundColor: C.white,
  },
  ok: { fontSize: 12, color: C.sageDeep },
  err: { fontSize: 12, color: C.danger },
  btn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: { fontSize: 13, color: C.fgMid },
  link: { fontSize: 12, color: C.fgFaint },
});
const s = profileWidgetStyles;
