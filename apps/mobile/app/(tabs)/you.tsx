import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, homeStyles as s } from "@/components/home";
import { useAuth } from "@/lib/auth";
import { C } from "@/components/login/tokens";

export default function YouTab() {
  const { signOut } = useAuth();
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <TopBar />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          gap: 24,
        }}
      >
        <Text style={s.sectionHand}>year-in-review will live here.</Text>
        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => ({
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: pressed ? C.paperDeep : "transparent",
          })}
        >
          <Text style={{ color: C.fgMid, fontSize: 13, letterSpacing: 0.3 }}>
            sign out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
