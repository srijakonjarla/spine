import { StyleSheet } from "react-native";
import { C } from "@/components/login/tokens";

/** Trailing "×" remove affordance shared by every row in a list. */
export const rowStyles = StyleSheet.create({
  removeBtn: { paddingHorizontal: 4, paddingTop: 2 },
  removeX: { fontSize: 20, color: C.fgFaint, lineHeight: 22 },
});
