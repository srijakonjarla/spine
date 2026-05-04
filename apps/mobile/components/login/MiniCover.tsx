import { Text, View } from "react-native";
import { styles } from "./styles";

export function MiniCover({
  title,
  author,
  bg,
  accent,
}: {
  title: string;
  author: string;
  bg: string;
  accent: string;
}) {
  return (
    <View style={[styles.miniCover, { backgroundColor: bg }]}>
      <Text style={[styles.miniCoverTitle, { color: accent }]}>{title}</Text>
      <Text style={styles.miniCoverAuthor}>{author}</Text>
    </View>
  );
}
