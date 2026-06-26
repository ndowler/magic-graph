/**
 * Deck Doctor — turn the graph metrics into actionable advice.
 *
 * Everything here is pure and deterministic: it reads a built `GraphModel`
 * (and, for additions, scores candidate cards with `computeFit`) and emits
 * ranked cut suggestions, deck-wide observations, and swap pairings. No
 * network and no React, so it is trivially unit-testable.
 */
import type { Card, Edge, FitResult, GraphModel, GraphNode, InteractionType } from "../types";
import { computeFit } from "./graph";
import { INTERACTION_LABELS } from "./colors";

export type Severity = "high" | "medium" | "low";

export interface CutSuggestion {
  node: GraphNode;
  /** Plain-English reason this card is a cut candidate. */
  reason: string;
  /** Number of real (non color-identity) synergy edges. */
  synergyEdges: number;
  weightedDegree: number;
  severity: Severity;
}

export interface Observation {
  kind: "good" | "warn" | "info";
  text: string;
}

export interface AdditionSuggestion {
  fit: FitResult;
}

export interface SwapSuggestion {
  cut: GraphNode;
  add: Card;
  fitScore: number;
}

/** Real synergy edges are everything except the baseline color-identity link. */
function isSynergy(e: Edge): boolean {
  return e.type !== "color-identity";
}

function incidentEdges(graph: GraphModel, id: string): Edge[] {
  return graph.edges.filter((e) => e.sourceId === id || e.targetId === id);
}

/**
 * Rank the deck's weakest non-commander cards as cut candidates. A card is a
 * candidate when it forms at most one real synergy edge; orphans (zero) come
 * first, then thin one-link cards, ordered by weighted degree.
 */
export function cutCandidates(graph: GraphModel, limit = 10): CutSuggestion[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const nameOf = (id: string) => byId.get(id)?.name ?? "a card";

  const suggestions: CutSuggestion[] = [];
  for (const node of graph.nodes) {
    if (node.isCommander) continue;
    const edges = incidentEdges(graph, node.id);
    const synergy = edges.filter(isSynergy);
    if (synergy.length > 1) continue;

    let reason: string;
    let severity: Severity;
    if (synergy.length === 0) {
      severity = "high";
      reason =
        "Dead card — only baseline color links; nothing in the deck interacts with it.";
    } else {
      severity = "medium";
      const e = synergy[0];
      const partner = nameOf(e.sourceId === node.id ? e.targetId : e.sourceId);
      reason = `Thin link — only synergizes with ${partner} (${INTERACTION_LABELS[e.type].toLowerCase()}).`;
    }
    suggestions.push({
      node,
      reason,
      synergyEdges: synergy.length,
      weightedDegree: node.weightedDegree,
      severity,
    });
  }

  suggestions.sort(
    (a, b) => a.synergyEdges - b.synergyEdges || a.weightedDegree - b.weightedDegree,
  );
  return suggestions.slice(0, limit);
}

/** Count real synergy edges per interaction type across the whole deck. */
function synergyTypeCounts(graph: GraphModel): Record<InteractionType, number> {
  const counts = Object.fromEntries(
    (Object.keys(INTERACTION_LABELS) as InteractionType[]).map((t) => [t, 0]),
  ) as Record<InteractionType, number>;
  for (const e of graph.edges) if (isSynergy(e)) counts[e.type]++;
  return counts;
}

/** Deck-wide observations: a cohesion verdict plus targeted strengths/gaps. */
export function deckObservations(graph: GraphModel): Observation[] {
  const obs: Observation[] = [];
  const m = graph.metrics;
  const nonCommander = graph.nodes.filter((n) => !n.isCommander);

  // Cohesion verdict.
  const score = m.cohesionScore;
  if (score >= 80) {
    obs.push({ kind: "good", text: `Highly synergistic deck (cohesion ${score}).` });
  } else if (score >= 60) {
    obs.push({ kind: "good", text: `Cohesive deck (cohesion ${score}).` });
  } else if (score >= 35) {
    obs.push({
      kind: "info",
      text: `Moderate cohesion (${score}) — there's room to tighten the synergy web.`,
    });
  } else {
    obs.push({
      kind: "warn",
      text: `Loose pile (cohesion ${score}) — many cards don't pull in the same direction.`,
    });
  }

  // Orphan share.
  const orphanCount = nonCommander.filter(
    (n) => incidentEdges(graph, n.id).every((e) => !isSynergy(e)),
  ).length;
  if (orphanCount > 0) {
    const pct = Math.round((orphanCount / Math.max(1, nonCommander.length)) * 100);
    obs.push({
      kind: orphanCount > nonCommander.length * 0.2 ? "warn" : "info",
      text: `${orphanCount} card(s) (${pct}%) don't meaningfully interact with the deck.`,
    });
  }

  // Interaction-type coverage.
  const counts = synergyTypeCounts(graph);
  const dominant = (Object.entries(counts) as [InteractionType, number][])
    .filter(([t]) => t !== "color-identity")
    .sort((a, b) => b[1] - a[1])[0];
  if (dominant && dominant[1] > 0) {
    obs.push({
      kind: "info",
      text: `Strongest engine: ${INTERACTION_LABELS[dominant[0]].toLowerCase()} (${dominant[1]} links).`,
    });
  }
  if (counts.combo === 0) {
    obs.push({ kind: "info", text: "No known combos detected — a finisher could raise the ceiling." });
  }

  // Hub over-reliance.
  const totalWeighted = graph.nodes.reduce((s, n) => s + n.weightedDegree, 0);
  const topHub = [...graph.nodes].sort((a, b) => b.weightedDegree - a.weightedDegree)[0];
  if (topHub && totalWeighted > 0) {
    const share = topHub.weightedDegree / totalWeighted;
    if (share > 0.25) {
      obs.push({
        kind: "warn",
        text: `Heavy reliance on ${topHub.name} (${Math.round(share * 100)}% of all synergy) — fragile if removed.`,
      });
    }
  }

  return obs;
}

/**
 * Score candidate cards against the current deck and return them ranked by fit
 * (best first), dropping cards that form no new interactions.
 */
export function rankAdditions(
  candidates: Card[],
  graph: GraphModel,
  limit = 10,
): AdditionSuggestion[] {
  const deckIds = new Set(graph.nodes.map((n) => n.id));
  const seen = new Set<string>();
  const out: AdditionSuggestion[] = [];
  for (const card of candidates) {
    if (deckIds.has(card.id) || seen.has(card.id)) continue;
    seen.add(card.id);
    const fit = computeFit(card, graph);
    if (fit.fitScore > 0 && fit.newEdges.length > 0) out.push({ fit });
  }
  out.sort((a, b) => b.fit.fitScore - a.fit.fitScore);
  return out.slice(0, limit);
}

/**
 * Pair the weakest cuts with the strongest additions into swap suggestions.
 * Returns up to `limit` pairings (worst cut ↔ best add, and so on).
 */
export function buildSwaps(
  cuts: CutSuggestion[],
  additions: AdditionSuggestion[],
  limit = 5,
): SwapSuggestion[] {
  const swaps: SwapSuggestion[] = [];
  const n = Math.min(cuts.length, additions.length, limit);
  for (let i = 0; i < n; i++) {
    swaps.push({
      cut: cuts[i].node,
      add: additions[i].fit.card,
      fitScore: additions[i].fit.fitScore,
    });
  }
  return swaps;
}
