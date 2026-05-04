import { StyleSheet } from "react-native";
import { C, SEAL_SIZE, SERIF } from "./tokens";

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.plumDark },

  // ─── Cover ────────────────────────────────────────────────────
  coverSafe: { backgroundColor: C.plumDark },
  cover: { overflow: "hidden", position: "relative" },

  // landing cover content
  coverInner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 26,
    justifyContent: "space-between",
  },
  estLine: {
    fontSize: 9.5,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "rgba(250,246,240,0.55)",
    fontWeight: "600",
  },
  titleLine: {
    fontFamily: SERIF,
    fontWeight: "700",
    color: C.cream,
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: -2.4,
  },
  titleItalic: { fontStyle: "italic", fontWeight: "400" },

  shelfRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  shelfTag: {
    color: "rgba(250,246,240,0.4)",
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 8,
    paddingBottom: 4,
    flexShrink: 1,
  },

  // form-step cover (top bar + headline)
  coverInnerForm: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 22,
    justifyContent: "space-between",
  },
  coverTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coverBack: {
    fontSize: 13,
    color: C.cream,
    opacity: 0.85,
    letterSpacing: 0.3,
  },
  coverWordmark: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: "700",
    color: C.cream,
    letterSpacing: -1,
  },
  headline: {
    fontFamily: SERIF,
    fontWeight: "700",
    color: C.cream,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.6,
  },
  headlineAccent: {
    fontStyle: "italic",
    fontWeight: "400",
    color: C.gold,
  },
  caption: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 15,
    color: C.cream,
    opacity: 0.85,
    marginTop: 10,
    letterSpacing: 0.1,
  },

  // ─── Mini cover ───────────────────────────────────────────────
  miniCover: {
    width: 42,
    height: 64,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 2 },
    elevation: 2,
  },
  miniCoverTitle: {
    fontFamily: SERIF,
    fontWeight: "700",
    fontSize: 7,
    lineHeight: 9,
    letterSpacing: -0.1,
  },
  miniCoverAuthor: {
    marginTop: "auto",
    fontSize: 6.5,
    color: "rgba(250,246,240,0.65)",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // ─── Flap (form) ──────────────────────────────────────────────
  flapHost: { flex: 1 },
  flap: { flex: 1, backgroundColor: C.paper, position: "relative" },
  foldShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    zIndex: 1,
  },
  flapContent: {
    paddingHorizontal: 28,
    paddingTop: 44,
    paddingBottom: 32,
    flexGrow: 1,
  },

  // ─── Gold seal ─────────────────────────────────────────────────
  sealWrap: {
    position: "absolute",
    top: -SEAL_SIZE / 2,
    left: 24,
    zIndex: 5,
  },
  seal: {
    width: SEAL_SIZE,
    height: SEAL_SIZE,
    borderRadius: SEAL_SIZE / 2,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sealMark: {
    fontFamily: SERIF,
    fontWeight: "700",
    color: C.plum,
    fontSize: 20,
    lineHeight: 22,
  },

  // wordmark + subtitle (landing flap only)
  wordmark: {
    fontFamily: SERIF,
    fontSize: 32,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1.4,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 14,
    color: C.fgMid,
    marginTop: 4,
    marginBottom: 22,
    lineHeight: 20,
  },

  // form fields
  formBlock: { gap: 14 },
  actions: { gap: 12, marginTop: 4 },
  field: { gap: 0 },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: C.fgMuted,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  inputBoxed: {
    fontSize: 15,
    color: C.fg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  forgotRow: { alignItems: "flex-end", marginTop: 6 },
  forgotText: { fontSize: 12, color: C.terraInk, letterSpacing: 0.3 },

  // CTAs
  ctaTerra: {
    backgroundColor: C.terraInk,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  ctaTerraPressed: { backgroundColor: C.terraPressed },
  ctaTerraText: {
    color: C.cream,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.4,
  },

  // landing secondary link
  linkRow: { paddingVertical: 10, alignItems: "center" },
  linkRowText: { color: C.fgMid, fontSize: 13, letterSpacing: 0.3 },

  // social button
  socialBtn: {
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#fff",
  },
  socialBtnPressed: { backgroundColor: C.paperDeep },
  socialIcon: { width: 18, alignItems: "center", justifyContent: "center" },
  socialBtnText: {
    color: C.fg,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  // divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.line,
  },
  dividerText: {
    fontSize: 10,
    color: C.fgMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },

  // misc
  disabled: { opacity: 0.5 },
  error: { fontSize: 13, color: "#b03a2e" },

  footerLinkCenter: { marginTop: 14, alignSelf: "center" },
  footerHint: { fontSize: 12, color: C.fgMuted, letterSpacing: 0.3 },
  footerHintAccent: { color: C.terraInk, textDecorationLine: "underline" },

  // signup fineprint
  fineprint: {
    fontSize: 11,
    color: C.fgMuted,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: 6,
  },
  fineprintLink: { color: C.fgMid, textDecorationLine: "underline" },

  // signup footer (pinned to bottom)
  signupFooter: {
    marginTop: "auto",
    paddingTop: 24,
    alignItems: "center",
  },
});
