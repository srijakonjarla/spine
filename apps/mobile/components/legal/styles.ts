import { Platform, StyleSheet } from "react-native";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export const legalStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },

  backBtn: { paddingVertical: 8, marginBottom: 18, alignSelf: "flex-start" },
  backText: {
    fontSize: 13,
    color: C.fgMuted,
    letterSpacing: 0.3,
  },

  header: {
    paddingBottom: 22,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,27,46,0.08)",
  },
  title: {
    fontFamily: SERIF,
    fontSize: 30,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1,
    lineHeight: 34,
  },
  lastUpdated: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 14,
    color: C.fgMuted,
    marginTop: 6,
  },

  section: {
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,27,46,0.06)",
  },
  sectionLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  sectionLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: C.fgMuted,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  body: {
    fontFamily: SERIF,
    fontSize: 14.5,
    lineHeight: 22,
    color: C.fgMid,
    marginBottom: 12,
  },
  bodyEm: { color: C.plum, fontWeight: "600" },
  bodyLink: { color: C.plum, textDecorationLine: "underline" },
  bullet: {
    fontFamily: SERIF,
    fontSize: 14.5,
    lineHeight: 22,
    color: C.fgMid,
    marginBottom: 6,
    paddingLeft: 4,
  },

  footer: {
    marginTop: 24,
  },
  footerLink: {
    fontSize: 13,
    color: C.fgMuted,
    letterSpacing: 0.3,
  },
});
