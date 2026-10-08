import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { C, SERIF } from "@/components/login/tokens";
import { AuthProvider } from "@/lib/auth";
import { BooksProvider } from "@/lib/booksContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BooksProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="choose-username" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="library/[status]" />
            <Stack.Screen name="library/series" />
            <Stack.Screen name="library/rereads" />
            <Stack.Screen name="library/recommendations" />
            <Stack.Screen name="year/[year]/review" />
            <Stack.Screen name="year/[year]/read" />
            <Stack.Screen name="year/[year]/quotes" />
            <Stack.Screen name="book/[id]" />
            <Stack.Screen name="list/[id]" />
            <Stack.Screen name="goal/[id]" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy" />
          </Stack>
        </BooksProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Shown instead of a blank screen when any screen throws while rendering. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={s.errorShell}>
      <StatusBar style="dark" />
      <Text style={s.errorTitle}>a page came loose.</Text>
      <Text style={s.errorBody}>
        something went wrong showing this screen. your library is safe — try
        again.
      </Text>
      <Pressable
        onPress={retry}
        style={({ pressed }) => [s.errorBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={s.errorBtnText}>try again</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  errorShell: {
    flex: 1,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontFamily: SERIF,
    fontSize: 24,
    fontStyle: "italic",
    fontWeight: "700",
    color: C.plum,
  },
  errorBody: {
    fontSize: 14,
    color: C.fgMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  errorBtn: {
    marginTop: 8,
    backgroundColor: C.terraInk,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  errorBtnText: { color: C.cream, fontSize: 13, fontWeight: "600" },
});
