/** Wallet presets with brand colours (plan: "Bangladesh-specific details"). Names come from messages. */
import type { WalletFields } from "./walletActions";

export const PRESETS = {
  cash: { kind: "cash", provider: null, color: "#16a34a", icon: "wallet" },
  bkash: { kind: "mfs", provider: "bkash", color: "#e2136e", icon: "smartphone" },
  nagad: { kind: "mfs", provider: "nagad", color: "#ec1c24", icon: "smartphone" },
  rocket: { kind: "mfs", provider: "rocket", color: "#8c3494", icon: "smartphone" },
  upay: { kind: "mfs", provider: "upay", color: "#0056a4", icon: "smartphone" },
  bank: { kind: "bank", provider: null, color: "#1d4ed8", icon: "landmark" },
  card: { kind: "card", provider: null, color: "#334155", icon: "credit-card" },
} satisfies Record<string, Omit<WalletFields, "name" | "opening_balance_paisa">>;

export type PresetKey = keyof typeof PRESETS;
