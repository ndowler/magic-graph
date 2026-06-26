import type { InteractionType } from "../types";

/** Map a card's colors to a node fill. */
export function cardColor(colors: string[], colorIdentity: string[]): string {
  const c = colors.length ? colors : colorIdentity;
  if (c.length === 0) return "#b9a779"; // colorless / artifact
  if (c.length > 1) return "#d9a441"; // multicolor gold
  switch (c[0]) {
    case "W": return "#f4efd6";
    case "U": return "#3a7dd6";
    case "B": return "#5b5563";
    case "R": return "#d4452f";
    case "G": return "#3f9b54";
    default: return "#999";
  }
}

/** Edge color by interaction type. */
export const EDGE_COLORS: Record<InteractionType, string> = {
  combo: "#ff3b6b",
  "triggered-loop": "#a855f7",
  tribal: "#22c55e",
  "resource-engine": "#0ea5e9",
  "keyword-synergy": "#eab308",
  enabler: "#f97316",
  "color-identity": "#3f3f46",
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  combo: "Combo",
  "triggered-loop": "Triggered loop",
  tribal: "Tribal",
  "resource-engine": "Resource engine",
  "keyword-synergy": "Keyword synergy",
  enabler: "Enabler",
  "color-identity": "Color identity",
};
