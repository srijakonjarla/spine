import { Pressable, Text, View } from "react-native";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";
import { homeStyles as s } from "./styles";

export function TopBar({ initial = "m" }: { initial?: string }) {
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
        <Pressable style={s.topAvatar} hitSlop={6}>
          <Text style={s.topAvatarText}>{initial.toLowerCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
}
