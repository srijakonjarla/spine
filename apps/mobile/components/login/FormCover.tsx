import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CoverGradient } from "./CoverGradient";
import { styles } from "./styles";
import { C } from "./tokens";

export function FormCover({
  height,
  onBack,
  pre,
  accent,
  post,
  caption,
}: {
  height: number;
  onBack: () => void;
  pre: string;
  accent: string;
  post: string;
  caption?: string;
}) {
  return (
    <SafeAreaView edges={["top"]} style={styles.coverSafe}>
      <View style={[styles.cover, { height }]}>
        <CoverGradient />
        <View style={styles.coverInnerForm}>
          <View style={styles.coverTopBar}>
            <Pressable onPress={onBack} hitSlop={10}>
              <Text style={styles.coverBack}>← back</Text>
            </Pressable>
            <Text style={styles.coverWordmark}>
              spine<Text style={{ color: C.terra }}>.</Text>
            </Text>
          </View>

          <View>
            <Text style={styles.headline}>
              {pre}
              {"\n"}
              <Text style={styles.headlineAccent}>{accent}</Text>
              {post}
            </Text>
            {caption && <Text style={styles.caption}>{caption}</Text>}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
