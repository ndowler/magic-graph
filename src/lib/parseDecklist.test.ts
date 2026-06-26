import { describe, expect, it } from "vitest";
import { parseDecklist } from "./parseDecklist";

describe("parseDecklist", () => {
  it("parses quantities and plain names", () => {
    const { entries } = parseDecklist("1 Sol Ring\n3x Forest\nLlanowar Elves");
    expect(entries).toEqual([
      { name: "Sol Ring", quantity: 1, isCommander: false },
      { name: "Forest", quantity: 3, isCommander: false },
      { name: "Llanowar Elves", quantity: 1, isCommander: false },
    ]);
  });

  it("flags commanders from a Commander section", () => {
    const { entries } = parseDecklist("Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring");
    expect(entries[0]).toMatchObject({ name: "Atraxa, Praetors' Voice", isCommander: true });
    expect(entries[1]).toMatchObject({ name: "Sol Ring", isCommander: false });
  });

  it("flags commanders from a *CMDR* marker", () => {
    const { entries } = parseDecklist("1 Najeela, the Blade-Blossom *CMDR*");
    expect(entries[0]).toMatchObject({ name: "Najeela, the Blade-Blossom", isCommander: true });
  });

  it("strips set/collector annotations and comments", () => {
    const { entries } = parseDecklist("1 Sol Ring (C21) 263 # great rock\n// a comment line");
    expect(entries).toEqual([{ name: "Sol Ring", quantity: 1, isCommander: false }]);
  });

  it("skips sideboard sections", () => {
    const { entries } = parseDecklist("Deck\n1 Sol Ring\nSideboard\n1 Pyroblast");
    expect(entries.map((e) => e.name)).toEqual(["Sol Ring"]);
  });

  it("merges duplicate names and accumulates quantity", () => {
    const { entries } = parseDecklist("1 Forest\n1 Forest");
    expect(entries).toEqual([{ name: "Forest", quantity: 2, isCommander: false }]);
  });
});
