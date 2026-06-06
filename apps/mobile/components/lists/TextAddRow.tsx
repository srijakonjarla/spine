import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { PlusIcon } from "@/components/icons";
import { C } from "@/components/login/tokens";

/**
 * Inline "add an idea / item / point" input used by idea / bullet /
 * checklist lists. Submits on enter or via the trailing + button.
 */
export function TextAddRow({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (text: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    if (!value.trim() || adding) return;
    setAdding(true);
    try {
      await onAdd(value);
      setValue("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={C.fgFaint}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!adding}
      />
      <Pressable
        onPress={submit}
        disabled={!value.trim() || adding}
        style={[styles.btn, !value.trim() && { opacity: 0.4 }]}
      >
        <PlusIcon size={16} color={C.cream} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.fg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 8,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.terraInk,
    alignItems: "center",
    justifyContent: "center",
  },
});
