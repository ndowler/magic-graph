import { describe, expect, it } from "vitest";
import type { Card } from "../../types";
import { extractFeatures } from "./features";
import { analyzeCards } from "./index";

let counter = 0;
function card(partial: Partial<Card> & { name: string }): Card {
  counter += 1;
  return {
    id: partial.id ?? `card-${counter}`,
    name: partial.name,
    oracleText: partial.oracleText ?? "",
    typeLine: partial.typeLine ?? "Creature",
    colors: partial.colors ?? [],
    colorIdentity: partial.colorIdentity ?? [],
    manaCost: partial.manaCost ?? "",
    cmc: partial.cmc ?? 0,
    power: partial.power ?? null,
    toughness: partial.toughness ?? null,
    keywords: partial.keywords ?? [],
    imageUri: null,
    isCommander: partial.isCommander ?? false,
  };
}

function hasEdge(edges: ReturnType<typeof analyzeCards>, type: string) {
  return edges.some((e) => e.type === type);
}

describe("extractFeatures", () => {
  it("reads creature subtypes from the type line", () => {
    const f = extractFeatures(card({ name: "Llanowar Elves", typeLine: "Creature — Elf Druid" }));
    expect(f.creatureTypes).toEqual(["Elf", "Druid"]);
  });

  it("detects tribal lord effects", () => {
    const f = extractFeatures(
      card({ name: "Elvish Archdruid", oracleText: "Other Elf creatures you control get +1/+1." }),
    );
    expect(f.tribalLordTypes).toContain("Elf");
  });

  it("detects sacrifice outlets and token makers", () => {
    expect(extractFeatures(card({ name: "Viscera Seer", oracleText: "Sacrifice a creature: Scry 1." })).sacOutlet).toBe(true);
    expect(extractFeatures(card({ name: "Bitterblossom", oracleText: "create a 1/1 black Faerie Rogue creature token." })).makesTokens).toBe(true);
  });

  it("detects keyword granting and caring", () => {
    expect(extractFeatures(card({ name: "Lord", oracleText: "Other creatures you control gain flying." })).keywordsGranted).toContain("Flying");
    expect(extractFeatures(card({ name: "Carer", oracleText: "Creatures with flying get +1/+0." })).keywordCarer).toContain("Flying");
  });
});

describe("analyzeCards", () => {
  it("emits a tribal edge between a lord and a matching creature", () => {
    const edges = analyzeCards([
      card({ name: "Elvish Archdruid", typeLine: "Creature — Elf Druid", oracleText: "Other Elf creatures you control get +1/+1." }),
      card({ name: "Llanowar Elves", typeLine: "Creature — Elf Druid", oracleText: "{T}: Add {G}." }),
    ]);
    expect(hasEdge(edges, "tribal")).toBe(true);
  });

  it("emits a triggered-loop edge between a sac outlet and a token maker", () => {
    const edges = analyzeCards([
      card({ name: "Viscera Seer", oracleText: "Sacrifice a creature: Scry 1." }),
      card({ name: "Bitterblossom", oracleText: "At the beginning of your upkeep, create a 1/1 black Faerie Rogue creature token." }),
    ]);
    expect(hasEdge(edges, "triggered-loop")).toBe(true);
  });

  it("emits a combo edge for a curated pair", () => {
    const edges = analyzeCards([
      card({ name: "Sanguine Bond" }),
      card({ name: "Exquisite Blood" }),
    ]);
    expect(hasEdge(edges, "combo")).toBe(true);
    expect(edges.find((e) => e.type === "combo")?.weight).toBe(1);
  });

  it("does not duplicate the same interaction type for a pair", () => {
    const edges = analyzeCards([
      card({ name: "Sanguine Bond" }),
      card({ name: "Exquisite Blood" }),
    ]);
    expect(edges.filter((e) => e.type === "combo")).toHaveLength(1);
  });

  it("produces no edges for unrelated cards", () => {
    const edges = analyzeCards([
      card({ name: "Mountain", typeLine: "Basic Land — Mountain" }),
      card({ name: "Island", typeLine: "Basic Land — Island" }),
    ]);
    expect(edges).toHaveLength(0);
  });
});
