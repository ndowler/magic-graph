import { describe, expect, it } from "vitest";
import type { Card } from "../types";
import { buildGraph } from "./graph";
import {
  buildSwaps,
  cutCandidates,
  deckObservations,
  rankAdditions,
} from "./recommend";

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
  card({
    id: "cmd",
    name: "Meren",
    isCommander: true,
    colorIdentity: ["B", "G"],
    oracleText: "Whenever another creature you control dies, ...",
  }),
  card({ id: "outlet", name: "Viscera Seer", oracleText: "Sacrifice a creature: Scry 1." }),
  card({ id: "maker", name: "Bitterblossom", oracleText: "create a 1/1 black Faerie Rogue creature token." }),
  card({ id: "lonely", name: "Random Vanilla", colorIdentity: ["B"], oracleText: "" }),
];

describe("cutCandidates", () => {
  it("flags the orphan as a high-severity cut and never the commander", () => {
    const g = buildGraph(deck);
    const cuts = cutCandidates(g);
    const ids = cuts.map((c) => c.node.id);
    expect(ids).toContain("lonely");
    expect(ids).not.toContain("cmd");
    const lonely = cuts.find((c) => c.node.id === "lonely")!;
    expect(lonely.severity).toBe("high");
    expect(lonely.synergyEdges).toBe(0);
  });

  it("orders orphans (zero synergy) ahead of thin one-link cards", () => {
    const g = buildGraph(deck);
    const cuts = cutCandidates(g);
    // The first entry should have the fewest synergy edges.
    for (let i = 1; i < cuts.length; i++) {
      expect(cuts[i - 1].synergyEdges).toBeLessThanOrEqual(cuts[i].synergyEdges);
    }
  });

  it("respects the limit", () => {
    const g = buildGraph(deck);
    expect(cutCandidates(g, 1)).toHaveLength(1);
  });
});

describe("deckObservations", () => {
  it("produces at least a cohesion verdict", () => {
    const g = buildGraph(deck);
    const obs = deckObservations(g);
    expect(obs.length).toBeGreaterThan(0);
    expect(obs[0].text.toLowerCase()).toContain("cohesion");
  });

  it("notes that no combos were detected for a combo-free deck", () => {
    const g = buildGraph(deck);
    const obs = deckObservations(g);
    expect(obs.some((o) => o.text.toLowerCase().includes("combo"))).toBe(true);
  });
});

describe("rankAdditions", () => {
  it("ranks a synergistic candidate above zero and skips non-interacting cards", () => {
    const g = buildGraph(deck);
    const candidates = [
      card({
        id: "blood",
        name: "Blood Artist",
        oracleText:
          "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",
      }),
      card({ id: "plains", name: "Plains", typeLine: "Basic Land — Plains" }),
    ];
    const adds = rankAdditions(candidates, g);
    expect(adds.length).toBeGreaterThan(0);
    expect(adds[0].fit.fitScore).toBeGreaterThan(0);
    expect(adds.map((a) => a.fit.card.id)).not.toContain("plains");
  });

  it("ignores cards already in the deck", () => {
    const g = buildGraph(deck);
    const adds = rankAdditions([card({ id: "outlet", name: "Viscera Seer" })], g);
    expect(adds).toHaveLength(0);
  });
});

describe("buildSwaps", () => {
  it("pairs the weakest cut with the strongest addition", () => {
    const g = buildGraph(deck);
    const cuts = cutCandidates(g);
    const adds = rankAdditions(
      [
        card({
          id: "blood",
          name: "Blood Artist",
          oracleText:
            "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",
        }),
      ],
      g,
    );
    const swaps = buildSwaps(cuts, adds);
    expect(swaps).toHaveLength(1);
    expect(swaps[0].cut.id).toBe(cuts[0].node.id);
    expect(swaps[0].add.id).toBe("blood");
  });
});
