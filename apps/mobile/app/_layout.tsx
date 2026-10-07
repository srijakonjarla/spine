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
            <Stack.Screen name="library/[status]" />
            <Stack.Screen name="library/series" />
            <Stack.Screen name="library/rereads" />
            <Stack.Screen name="library/recommendations" />
            <Stack.Screen name="year/[year]/review" />
            <Stack.Screen name="year/[year]/read" />
            <Stack.Screen name="year/[year]/quotes" />
            <Stack.Screen name="book/[id]" />
            <Stack.Screen name="list/[id]" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy" />
          </Stack>
        </BooksProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
