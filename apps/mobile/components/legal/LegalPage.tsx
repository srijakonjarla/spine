import { useRouter } from "expo-router";
import { ReactNode } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { legalStyles as s } from "./styles";

export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backText}>← back</Text>
        </Pressable>

        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.lastUpdated}>{lastUpdated}</Text>
        </View>

        {children}

        <View style={s.footer}>
          <Pressable
            onPress={() =>
              Linking.openURL("mailto:hello@spinereads.com").catch(() => {})
            }
            hitSlop={8}
          >
            <Text style={s.footerLink}>questions? hello@spinereads.com</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[s.section, last && s.sectionLast]}>
      <Text style={s.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}

export function Em({ children }: { children: ReactNode }) {
  return <Text style={s.bodyEm}>{children}</Text>;
}

export function Bullet({ children }: { children: ReactNode }) {
  return <Text style={s.bullet}>— {children}</Text>;
}
