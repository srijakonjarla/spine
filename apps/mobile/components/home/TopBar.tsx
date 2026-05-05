import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";
import { useAuth } from "@/lib/auth";
import { homeStyles as s } from "./styles";

function initialsFromUser(
  user:
    | {
        email?: string;
        user_metadata?: { name?: string; full_name?: string };
      }
    | null
    | undefined,
): string {
  const meta = user?.user_metadata;
  const full = meta?.name ?? meta?.full_name;
  if (full) {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toLowerCase();
    if (parts.length === 1) return parts[0][0].toLowerCase();
  }
  if (user?.email) return user.email[0].toLowerCase();
  return "r";
}

export function TopBar({ initials }: { initials?: string } = {}) {
  const { session } = useAuth();
  const router = useRouter();
  const display = initials ?? initialsFromUser(session?.user);
  return (
    <View style={s.topBar}>
      <Text style={s.topWordmark}>
        spine<Text style={{ color: C.terra }}>.</Text>
      </Text>
      <View style={s.topActions}>
        <Pressable style={s.topIconBtn} hitSlop={6}>
          <SearchIcon color={C.plum} size={18} />
        </Pressable>
        <Pressable style={s.topIconBtn} hitSlop={6}>
          <PlusIcon color={C.plum} size={18} />
        </Pressable>
        <Pressable
          style={s.topAvatar}
          hitSlop={6}
          onPress={() => router.push("/profile")}
        >
          <Text style={s.topAvatarText}>{display}</Text>
        </Pressable>
      </View>
    </View>
  );
}
