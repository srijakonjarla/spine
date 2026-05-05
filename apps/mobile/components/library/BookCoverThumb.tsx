import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export function BookCoverThumb({
  coverUrl,
  title,
  author,
  width,
  height,
  small = false,
}: {
  coverUrl?: string;
  title: string;
  author?: string;
  width: number;
  height: number;
  small?: boolean;
}) {
  const lastName = (author ?? "").split(" ").slice(-1)[0] ?? "";

  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={[styles.cover, { width, height, backgroundColor: "#26405e" }]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.cover, styles.fallback, { width, height }]}>
      <Text
        numberOfLines={3}
        style={[styles.title, small && { fontSize: 8, lineHeight: 9 }]}
      >
        {title.toLowerCase()}
      </Text>
      {lastName ? (
        <Text style={[styles.author, small && { fontSize: 5 }]}>
          {lastName.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: 4,
    overflow: "hidden",
  },
  fallback: {
    backgroundColor: "#26405e",
    padding: 6,
    justifyContent: "space-between",
  },
  title: {
    fontFamily: SERIF,
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 13,
    color: C.cream,
    letterSpacing: -0.2,
  },
  author: {
    fontSize: 6,
    color: "rgba(250,246,240,0.6)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
