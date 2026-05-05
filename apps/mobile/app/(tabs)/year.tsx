import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, homeStyles as s } from "@/components/home";

export default function YearTab() {
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
        <Text style={s.sectionHand}>year-in-review will live here.</Text>
      </View>
    </SafeAreaView>
  );
}
