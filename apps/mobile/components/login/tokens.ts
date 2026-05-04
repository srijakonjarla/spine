import { Platform } from "react-native";

export const C = {
  plum: "#2d1b2e",
  plumDark: "#1c0e1f",
  plumDeep: "#120810",
  plumGlow: "#3d2a3f",
  terra: "#c97b5a",
  terraInk: "#b8533a",
  terraPressed: "#a04630",
  gold: "#d4a843",
  cream: "#faf6f0",
  paper: "#fbf8f2",
  paperDeep: "#f0e8db",
  line: "#e4d9c5",
  fg: "#2d1b2e",
  fgMid: "#3d2e2e",
  fgMuted: "#8a7a6a",
  fgFaint: "#c4bfba",
};

export const SERIF = Platform.select({ ios: "Georgia", default: "serif" });

export const SEAL_SIZE = 38;
