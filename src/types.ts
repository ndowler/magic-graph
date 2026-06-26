/**
 * Core domain types for MagicGraph.
 *
 * The data model mirrors the PRD: a deck is resolved into `Card`s, the
 * interaction engine emits weighted `Edge`s, and everything is assembled into
 * a `GraphModel` for the UI to render and query.
 */

/** A single parsed line from a decklist, before resolution against Scryfall. */
export interface DeckEntry {
  /** Card name as written by the user (may be misspelled). */
  name: string;
  /** Quantity. For singleton Commander this is almost always 1. */
  quantity: number;
  /** Whether the user (or import format) flagged this as a commander. */
  isCommander: boolean;
}

/** Result of parsing raw decklist text. */
export interface ParsedDecklist {
  entries: DeckEntry[];
  /** Lines we could not parse, surfaced to the user. */
  warnings: string[];
}

/**
 * A resolved card. Fields map onto the subset of Scryfall data the engine
 * needs. Kept intentionally flat so rule modules and tests are easy to write.
 */
export interface Card {
  id: string;
  name: string;
  oracleText: string;
  typeLine: string;
  /** e.g. ["W","U"] — the card's colors. */
  colors: string[];
  /** Color identity (includes mana symbols in text); used for the baseline edge. */
  colorIdentity: string[];
  manaCost: string;
  cmc: number;
  power: string | null;
  toughness: string | null;
  /** Scryfall keywords, e.g. ["Flying","Lifelink"]. */
  keywords: string[];
  imageUri: string | null;
  isCommander: boolean;
}

/** The categories of interaction the engine can detect. */
export type InteractionType =
  | "combo"
  | "tribal"
  | "triggered-loop"
  | "resource-engine"
  | "keyword-synergy"
  | "enabler"
  | "color-identity";

/** A weighted, explained interaction between two cards. */
export interface Edge {
  sourceId: string;
  targetId: string;
  type: InteractionType;
  /** 0–1 interaction strength. */
  weight: number;
  /** Human-readable reason this edge exists. */
  explanation: string;
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  /** Mean number of edges per node. */
  avgDegree: number;
  /** Edges / possible edges, 0–1. */
  density: number;
  /** 0–100 overall deck synergy score. */
  cohesionScore: number;
  clusterCount: number;
}

export interface GraphNode extends Card {
  /** Number of edges incident to this node. */
  degree: number;
  /** Sum of incident edge weights. */
  weightedDegree: number;
  /** Cluster id assigned by community detection. */
  cluster: number;
}

export interface GraphModel {
  commanderIds: string[];
  nodes: GraphNode[];
  edges: Edge[];
  metrics: GraphMetrics;
}

/** Result of simulating the addition of a candidate card to a deck. */
export interface FitResult {
  card: Card;
  /** Edges the candidate would form with the existing deck. */
  newEdges: Edge[];
  /** 0–100 normalized measure of how well the card connects. */
  fitScore: number;
}
