import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeDeck, encodeDeck, readDeckFromHash } from "./share";

const DECK = `Commander
1 Atraxa, Praetors' Voice *CMDR*

Deck
1 Sol Ring
1 Doubling Season`;

describe("share encoding", () => {
  it("round-trips a decklist through encode/decode", () => {
    expect(decodeDeck(encodeDeck(DECK))).toBe(DECK);
  });

  it("produces URL-safe output (no +, /, or = padding)", () => {
    const encoded = encodeDeck(DECK);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("preserves non-ASCII characters", () => {
    const text = "Jötun Grunt\nSéance — 双子";
    expect(decodeDeck(encodeDeck(text))).toBe(text);
  });

  it("returns null for malformed input rather than throwing", () => {
    expect(decodeDeck("!!!not base64!!!")).toBeNull();
  });
});

describe("share URLs", () => {
  it("embeds the deck in the location fragment and reads it back", () => {
    const url = buildShareUrl(DECK, "https://magicgraph.app/");
    expect(url.startsWith("https://magicgraph.app/#deck=")).toBe(true);

    const hash = new URL(url).hash;
    expect(readDeckFromHash(hash)).toBe(DECK);
  });

  it("ignores hashes that are not deck links", () => {
    expect(readDeckFromHash("#section=insights")).toBeNull();
    expect(readDeckFromHash("")).toBeNull();
  });
});
