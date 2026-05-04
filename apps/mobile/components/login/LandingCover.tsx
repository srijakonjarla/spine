import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CoverGradient } from "./CoverGradient";
import { MiniCover } from "./MiniCover";
import { styles } from "./styles";
import { C } from "./tokens";

const SHELF_BOOKS = [
  {
    title: "on earth...",
    author: "ocean vuong",
    bg: "#5d3a42",
    accent: "#f5ece0",
  },
  {
    title: "hungerstone",
    author: "kat dunn",
    bg: "#8a5c60",
    accent: "#d4a843",
  },
  {
    title: "the compound",
    author: "aisling rawle",
    bg: "#c97b5a",
    accent: "#faf6f0",
  },
];

export function LandingCover({ height }: { height: number }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.coverSafe}>
      <View style={[styles.cover, { height }]}>
        <CoverGradient />
        <View style={styles.coverInner}>
          <Text style={styles.estLine}>
            a quiet home for your reading · est. 2026
          </Text>
          <View>
            <Text style={styles.titleLine}>the</Text>
            <Text style={[styles.titleLine, styles.titleItalic]}>reading</Text>
            <Text style={styles.titleLine}>
              journal<Text style={{ color: C.terra }}>.</Text>
            </Text>
          </View>
          <View style={styles.shelfRow}>
            {SHELF_BOOKS.map((b) => (
              <MiniCover key={b.title} {...b} />
            ))}
            <Text style={styles.shelfTag}>shelves · marginalia · moods</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
