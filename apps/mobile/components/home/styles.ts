import { Platform, StyleSheet } from "react-native";
import { C } from "@/components/login/tokens";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export const homeStyles = StyleSheet.create({
  // ─── Page shell ────────────────────────────────────────────────
  safe: { flex: 1, backgroundColor: C.cream },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
  },

  // ─── Top bar (sticky) ──────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: C.cream,
  },
  topWordmark: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  topIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  topAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.terraInk,
    alignItems: "center",
    justifyContent: "center",
  },
  topAvatarText: {
    fontFamily: SERIF,
    fontWeight: "700",
    fontSize: 15,
    color: C.cream,
  },

  // ─── Greeting ──────────────────────────────────────────────────
  dateLine: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    color: C.fgMuted,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 8,
  },
  greeting: {
    fontFamily: SERIF,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -1.4,
  },
  statLine: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 16,
    color: C.terraInk,
    marginTop: 8,
    marginBottom: 24,
  },

  // ─── Section labels ────────────────────────────────────────────
  sectionLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: C.fgMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionHand: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 16,
    color: C.fgMid,
  },
  sectionLink: {
    fontSize: 12,
    color: C.fgMuted,
    letterSpacing: 0.3,
  },

  // ─── Currently reading card ────────────────────────────────────
  bookCard: {
    backgroundColor: C.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(45,27,46,0.08)",
    padding: 14,
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: "#26405e",
    padding: 6,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 2 },
    elevation: 2,
  },
  bookCoverTitle: {
    fontFamily: SERIF,
    fontWeight: "700",
    fontSize: 9,
    lineHeight: 11,
    color: C.cream,
    letterSpacing: -0.2,
  },
  bookCoverAuthor: {
    fontSize: 6,
    color: "rgba(250,246,240,0.6)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  bookBody: { flex: 1, justifyContent: "space-between" },
  bookTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  bookAuthor: {
    fontSize: 13,
    color: C.fgMuted,
    marginTop: 1,
  },
  bookMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  bookMetaText: {
    fontSize: 12,
    color: C.fgMid,
    letterSpacing: 0.2,
  },
  bookMetaDot: {
    fontSize: 12,
    color: C.fgFaint,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(45,27,46,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.terraInk,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: C.fgMuted,
    letterSpacing: 0.2,
    minWidth: 56,
  },
  progressPercent: {
    fontFamily: SERIF,
    fontSize: 13,
    fontWeight: "700",
    color: C.plum,
    minWidth: 32,
    textAlign: "right",
  },

  // ─── Quick actions row ─────────────────────────────────────────
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: C.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(45,27,46,0.08)",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  quickBtnPressed: { backgroundColor: C.paperDeep },
  quickBtnLabel: {
    fontSize: 12,
    color: C.fgMid,
    letterSpacing: 0.2,
  },

  // ─── Stat cards row ────────────────────────────────────────────
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(45,27,46,0.08)",
    padding: 14,
    minHeight: 130,
    overflow: "hidden",
  },
  statTopBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: C.fgMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  statBig: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -0.6,
  },
  statBigSecondary: {
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: "400",
    color: C.fgMuted,
  },
  statSub: {
    fontSize: 11,
    color: C.fgMuted,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  statCaveat: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 13,
    color: C.fgMid,
    marginTop: "auto",
    paddingTop: 8,
  },
  // small bar chart
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 32,
    gap: 3,
    marginBottom: 8,
  },
  bar: {
    flex: 1,
    backgroundColor: C.line,
    borderRadius: 1,
  },
  barActive: {
    backgroundColor: "#7b9e87",
  },

  // ─── Recent entries ────────────────────────────────────────────
  entryCard: {
    backgroundColor: C.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(45,27,46,0.08)",
    padding: 14,
    marginBottom: 10,
  },
  entryDate: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: C.terraInk,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  entryTitle: {
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: "700",
    color: C.plum,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  entryNote: {
    fontFamily: SERIF,
    fontSize: 14,
    lineHeight: 20,
    color: C.fgMid,
    marginBottom: 8,
  },
  entryFooter: {
    fontSize: 11,
    color: C.fgMuted,
    letterSpacing: 0.2,
  },
});
