import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { needsUsername } from "@/lib/account";

export default function Index() {
  const { session, loading } = useAuth();
  const userId = session?.user.id;
  // null = still checking. Accounts created via Google have no username
  // until they pick one (same gate as web's /auth/callback).
  const [missingUsername, setMissingUsername] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setMissingUsername(null);
    needsUsername(userId)
      .then((v) => !cancelled && setMissingUsername(v))
      .catch(() => !cancelled && setMissingUsername(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading || (session && missingUsername === null)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (missingUsername) return <Redirect href="/choose-username" />;
  return <Redirect href="/(tabs)" />;
}
