import type { Card, Edge } from "../../types";
import { withFeatures, type CardWithFeatures } from "./features";
import { RULES } from "./rules";

export { extractFeatures, withFeatures } from "./features";
export type { CardFeatures, CardWithFeatures } from "./features";
export { RULES } from "./rules";

/**
 * Run every rule over every unordered pair of cards and collect the edges.
 *
 * Edges are de-duplicated on (type, unordered pair) so two rules can't emit the
 * same relationship twice, while genuinely different interaction *types* between
 * the same pair are all preserved (each is a distinct reason to show the user).
 */
export function analyzeCards(cards: Card[]): Edge[] {
  const featured: CardWithFeatures[] = cards.map(withFeatures);
  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < featured.length; i++) {
    for (let j = i + 1; j < featured.length; j++) {
      const a = featured[i];
      const b = featured[j];
      for (const rule of RULES) {
        for (const e of rule(a, b)) {
          const [x, y] = [e.sourceId, e.targetId].sort();
          const dedupeKey = `${e.type}|${x}|${y}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          edges.push(e);
        }
      }
    }
  }

  return edges;
}

/** Compute the edges a single candidate card forms against an existing deck. */
export function analyzeCandidate(candidate: Card, deck: Card[]): Edge[] {
  const cand = withFeatures(candidate);
  const featured = deck.map(withFeatures);
  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const other of featured) {
    if (other.card.id === cand.card.id) continue;
    for (const rule of RULES) {
      for (const e of rule(cand, other)) {
        const [x, y] = [e.sourceId, e.targetId].sort();
        const dedupeKey = `${e.type}|${x}|${y}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        edges.push(e);
      }
    }
  }

  return edges;
}
