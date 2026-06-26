import type {
  Card,
  Edge,
  FitResult,
  GraphMetrics,
  GraphModel,
  GraphNode,
} from "../types";
import { analyzeCandidate, analyzeCards } from "./engine";
import { BASE_WEIGHTS } from "./engine/weights";

/** Minimum edge weight considered a "real" synergy for clustering. */
const CLUSTER_THRESHOLD = 0.4;

class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // Path compression.
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    this.parent.set(this.find(a), this.find(b));
  }
}

/** Attach low-weight color-identity edges so no non-commander card is orphaned. */
function attachOrphanBaselines(
  cards: Card[],
  edges: Edge[],
  commanderIds: string[],
): Edge[] {
  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.sourceId);
    connected.add(e.targetId);
  }
  const commanders = cards.filter((c) => commanderIds.includes(c.id));
  const extra: Edge[] = [];

  for (const card of cards) {
    if (commanderIds.includes(card.id) || connected.has(card.id)) continue;
    // Link the orphan to a commander that shares color identity, else any commander.
    const host =
      commanders.find((cmd) =>
        card.colorIdentity.some((c) => cmd.colorIdentity.includes(c)),
      ) ?? commanders[0];
    if (!host) continue;
    extra.push({
      sourceId: host.id,
      targetId: card.id,
      type: "color-identity",
      weight: BASE_WEIGHTS["color-identity"],
      explanation: `No specific synergy detected; ${card.name} shares color identity with ${host.name}.`,
    });
  }
  return extra;
}

function computeMetrics(nodes: GraphNode[], edges: Edge[], clusterCount: number): GraphMetrics {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const avgDegree = nodeCount ? (2 * edgeCount) / nodeCount : 0;
  const possible = nodeCount > 1 ? (nodeCount * (nodeCount - 1)) / 2 : 1;
  const density = edgeCount / possible;

  const avgWeightedDegree = nodeCount
    ? nodes.reduce((s, n) => s + n.weightedDegree, 0) / nodeCount
    : 0;
  const orphanFraction = nodeCount
    ? nodes.filter((n) => n.degree === 0).length / nodeCount
    : 0;
  // Heuristic 0–100: scales with average synergy per card, penalised by orphans.
  const cohesionScore = Math.round(
    Math.max(
      0,
      Math.min(100, (avgWeightedDegree / 4) * 100 * (1 - 0.5 * orphanFraction)),
    ),
  );

  return { nodeCount, edgeCount, avgDegree, density, cohesionScore, clusterCount };
}

/**
 * Build the full graph model from resolved cards. If `precomputedEdges` is
 * omitted, the interaction engine is run to produce them.
 */
export function buildGraph(cards: Card[], precomputedEdges?: Edge[]): GraphModel {
  const commanderIds = cards.filter((c) => c.isCommander).map((c) => c.id);
  const synergyEdges = precomputedEdges ?? analyzeCards(cards);
  const baselineEdges = attachOrphanBaselines(cards, synergyEdges, commanderIds);
  const edges = [...synergyEdges, ...baselineEdges];

  // Degrees.
  const degree = new Map<string, number>();
  const weighted = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.sourceId, (degree.get(e.sourceId) ?? 0) + 1);
    degree.set(e.targetId, (degree.get(e.targetId) ?? 0) + 1);
    weighted.set(e.sourceId, (weighted.get(e.sourceId) ?? 0) + e.weight);
    weighted.set(e.targetId, (weighted.get(e.targetId) ?? 0) + e.weight);
  }

  // Clusters via union-find over meaningful edges.
  const uf = new UnionFind();
  for (const c of cards) uf.find(c.id);
  for (const e of edges) {
    if (e.weight >= CLUSTER_THRESHOLD) uf.union(e.sourceId, e.targetId);
  }
  const rootToCluster = new Map<string, number>();
  let nextCluster = 0;
  const clusterOf = (id: string): number => {
    const root = uf.find(id);
    if (!rootToCluster.has(root)) rootToCluster.set(root, nextCluster++);
    return rootToCluster.get(root)!;
  };

  const nodes: GraphNode[] = cards.map((c) => ({
    ...c,
    degree: degree.get(c.id) ?? 0,
    weightedDegree: weighted.get(c.id) ?? 0,
    cluster: clusterOf(c.id),
  }));

  // Count non-trivial clusters (size >= 2).
  const sizes = new Map<number, number>();
  for (const n of nodes) sizes.set(n.cluster, (sizes.get(n.cluster) ?? 0) + 1);
  const clusterCount = [...sizes.values()].filter((s) => s >= 2).length;

  const metrics = computeMetrics(nodes, edges, clusterCount);
  return { commanderIds, nodes, edges, metrics };
}

/**
 * Simulate adding a candidate card. Fit score per the PRD:
 *   clamp( Σ(new edge weights) / deckAvgNodeWeight × 100, 0, 100 )
 */
export function computeFit(candidate: Card, graph: GraphModel): FitResult {
  const deck = graph.nodes as Card[];
  const newEdges = analyzeCandidate(candidate, deck);
  const totalNewWeight = newEdges.reduce((s, e) => s + e.weight, 0);

  const deckAvgNodeWeight =
    graph.nodes.length
      ? graph.nodes.reduce((s, n) => s + n.weightedDegree, 0) / graph.nodes.length
      : 1;
  const denom = deckAvgNodeWeight || 1;

  const fitScore = Math.round(
    Math.max(0, Math.min(100, (totalNewWeight / denom) * 100)),
  );

  return { card: candidate, newEdges, fitScore };
}

/** Convenience: cards ranked by connectivity (hubs first). */
export function rankByConnectivity(graph: GraphModel): GraphNode[] {
  return [...graph.nodes].sort(
    (a, b) => b.weightedDegree - a.weightedDegree || b.degree - a.degree,
  );
}

/** Cards with no synergy edges above baseline (potential cuts / dead cards). */
export function orphans(graph: GraphModel): GraphNode[] {
  return graph.nodes.filter(
    (n) =>
      !n.isCommander &&
      graph.edges
        .filter((e) => e.sourceId === n.id || e.targetId === n.id)
        .every((e) => e.type === "color-identity"),
  );
}
