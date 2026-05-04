import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, homeStyles as s } from "@/components/home";

export default function LibraryTab() {
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <TopBar />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <Text style={s.sectionHand}>your shelves are quiet here.</Text>
      </View>
    </SafeAreaView>
  );
}
