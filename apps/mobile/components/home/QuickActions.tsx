import { Pressable, Text, View } from "react-native";
import { CheckIcon, PlusIcon, QuoteIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";
import { homeStyles as s } from "./styles";

export function QuickActions({
  onLogProgress,
  onSaveQuote,
  onMarkDone,
  disabled = false,
}: {
  onLogProgress?: () => void;
  onSaveQuote?: () => void;
  onMarkDone?: () => void;
  disabled?: boolean;
}) {
  const opacity = disabled ? 0.4 : 1;
  return (
    <View style={s.quickRow}>
      <Pressable
        onPress={onLogProgress}
        disabled={disabled}
        style={({ pressed }) => [
          s.quickBtn,
          { opacity },
          pressed && s.quickBtnPressed,
        ]}
      >
        <PlusIcon color={C.terraInk} size={18} />
        <Text style={s.quickBtnLabel}>log progress</Text>
      </Pressable>
      <Pressable
        onPress={onSaveQuote}
        disabled={disabled}
        style={({ pressed }) => [
          s.quickBtn,
          { opacity },
          pressed && s.quickBtnPressed,
        ]}
      >
        <QuoteIcon color={C.gold} size={16} />
        <Text style={s.quickBtnLabel}>save quote</Text>
      </Pressable>
      <Pressable
        onPress={onMarkDone}
        disabled={disabled}
        style={({ pressed }) => [
          s.quickBtn,
          { opacity },
          pressed && s.quickBtnPressed,
        ]}
      >
        <CheckIcon color="#7b9e87" size={16} />
        <Text style={s.quickBtnLabel}>mark done</Text>
      </Pressable>
    </View>
  );
}
