import { Text } from "react-native";
import { C } from "@/components/login/tokens";

/** Read-only star rating; supports halves (rendered as ½). */
export function Stars({
  rating,
  size = 11,
}: {
  rating: number;
  size?: number;
}) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <Text style={{ fontSize: size, color: C.gold, letterSpacing: 0.5 }}>
      {"★".repeat(full)}
      {half ? "½" : ""}
    </Text>
  );
}
