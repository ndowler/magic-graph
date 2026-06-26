import type { InteractionType } from "../../types";

/**
 * Base interaction weights (0–1), per the PRD's weighting table. Specificity
 * wins: a named combo outweighs a tribal match, which outweighs a shared color.
 */
export const BASE_WEIGHTS: Record<InteractionType, number> = {
  combo: 1.0,
  "triggered-loop": 0.75,
  tribal: 0.65,
  "resource-engine": 0.55,
  "keyword-synergy": 0.5,
  enabler: 0.35,
  "color-identity": 0.1,
};
