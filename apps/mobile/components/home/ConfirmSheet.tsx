import { Pressable, Text, View } from "react-native";
import { SheetModal, sheetStyles as m } from "@/components/SheetModal";
import { C } from "@/components/login/tokens";

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  busyLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  busyLabel?: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <SheetModal open={open} onClose={onClose}>
      <Text style={m.title}>{title}</Text>
      {message ? <Text style={m.body}>{message}</Text> : null}
      <View style={m.actionsRow}>
        <Pressable hitSlop={8} onPress={onClose} style={m.cancelBtn}>
          <Text style={m.cancelText}>cancel</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={busy}
          style={({ pressed }) => [
            m.primaryBtn,
            busy && { opacity: 0.4 },
            pressed && { backgroundColor: C.terraPressed },
          ]}
        >
          <Text style={m.primaryText}>
            {busy ? (busyLabel ?? `${confirmLabel}…`) : confirmLabel}
          </Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}
