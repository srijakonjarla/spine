import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { BooksProvider } from "@/lib/booksContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BooksProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="library/want-to-read" />
            <Stack.Screen name="book/[id]" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy" />
          </Stack>
        </BooksProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
