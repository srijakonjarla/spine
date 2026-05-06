import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

/**
 * Bottom-sheet wrapper used by all home-tab modals (log progress, save
 * quote, confirm mark-done). Backdrop tap dismisses; KeyboardAvoidingView
 * keeps inputs visible above the iOS keyboard.
 */
export function SheetModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={sheetStyles.kav}
      >
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={sheetStyles.sheet}>{children}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const sheetStyles = StyleSheet.create({
  kav: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: C.cream,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: C.fgMuted,
    fontStyle: "italic",
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: C.fgMuted,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    color: C.fgMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 6,
  },
  input: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.fg,
  },
  inputMulti: { minHeight: 80 },
  inputSerif: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 15,
    lineHeight: 24,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { fontSize: 13, color: C.fgMuted },
  primaryBtn: {
    backgroundColor: C.terraInk,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryText: {
    color: C.cream,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
