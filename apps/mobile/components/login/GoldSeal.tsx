import { Text, View } from "react-native";
import { styles } from "./styles";
import { C } from "./tokens";

export function GoldSeal() {
  return (
    <View style={styles.sealWrap} pointerEvents="none">
      <View style={styles.seal}>
        <Text style={styles.sealMark}>
          s<Text style={{ color: C.terraInk }}>.</Text>
        </Text>
      </View>
    </View>
  );
}
