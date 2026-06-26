import { describe, expect, it } from "vitest";
import type { Card } from "../types";
import { buildGraph, computeFit, orphans } from "./graph";

function card(partial: Partial<Card> & { name: string; id: string }): Card {
  return {
    oracleText: "",
    typeLine: "Creature",
    colors: [],
    colorIdentity: [],
    manaCost: "",
    cmc: 0,
    power: null,
    toughness: null,
    keywords: [],
    imageUri: null,
    isCommander: false,
    ...partial,
  };
}

const deck: Card[] = [
  card({ id: "cmd", name: "Meren", isCommander: true, colorIdentity: ["B", "G"], oracleText: "Whenever another creature you control dies, ..." }),
  card({ id: "outlet", name: "Viscera Seer", oracleText: "Sacrifice a creature: Scry 1." }),
  card({ id: "maker", name: "Bitterblossom", oracleText: "create a 1/1 black Faerie Rogue creature token." }),
  card({ id: "lonely", name: "Random Vanilla", colorIdentity: ["B"], oracleText: "" }),
];

describe("buildGraph", () => {
  it("computes nodes, degrees, and metrics", () => {
    const g = buildGraph(deck);
    expect(g.nodes).toHaveLength(4);
    expect(g.commanderIds).toEqual(["cmd"]);
    expect(g.metrics.cohesionScore).toBeGreaterThanOrEqual(0);
    expect(g.metrics.cohesionScore).toBeLessThanOrEqual(100);
  });

  it("attaches an orphan to a commander via a color-identity baseline edge", () => {
    const g = buildGraph(deck);
    const lonelyEdges = g.edges.filter((e) => e.sourceId === "lonely" || e.targetId === "lonely");
    expect(lonelyEdges.length).toBeGreaterThan(0);
    expect(lonelyEdges.every((e) => e.type === "color-identity")).toBe(true);
  });

  it("flags orphan cards (only baseline edges) as weak links", () => {
    const g = buildGraph(deck);
    expect(orphans(g).map((n) => n.id)).toContain("lonely");
  });
});

describe("computeFit", () => {
  it("scores a synergistic candidate above zero and returns its new edges", () => {
    const g = buildGraph(deck);
    const candidate = card({
      id: "cand",
      name: "Blood Artist",
      oracleText: "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",
    });
    const fit = computeFit(candidate, g);
    expect(fit.fitScore).toBeGreaterThan(0);
    expect(fit.newEdges.length).toBeGreaterThan(0);
  });

  it("scores a card with no interactions at zero", () => {
    const g = buildGraph(deck);
    const fit = computeFit(card({ id: "x", name: "Plains", typeLine: "Basic Land — Plains" }), g);
    expect(fit.fitScore).toBe(0);
    expect(fit.newEdges).toHaveLength(0);
  });
});
