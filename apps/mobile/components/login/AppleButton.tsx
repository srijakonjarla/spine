import { useEffect, useState } from "react";
import { View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { styles } from "./styles";

const HEIGHT = 46;

/**
 * Apple's own "Continue with Apple" button (required styling for Sign in
 * with Apple). Renders nothing where Apple sign-in isn't available
 * (Android, older iOS).
 */
export function AppleButton({
  busy,
  onPress,
}: {
  busy: boolean;
  onPress: () => void;
}) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;
  return (
    <View
      style={busy ? styles.disabled : undefined}
      pointerEvents={busy ? "none" : "auto"}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
        }
        cornerRadius={HEIGHT / 2}
        style={{ width: "100%", height: HEIGHT }}
        onPress={onPress}
      />
    </View>
  );
}
