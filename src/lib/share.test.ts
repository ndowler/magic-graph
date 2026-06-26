import { describe, expect, it } from "vitest";
import type { Card } from "../types";
import {
  buildShareUrl,
  decodeDeck,
  encodeDeck,
  readDeckFromHash,
  serializeDeck,
} from "./share";
import { parseDecklist } from "./parseDecklist";

function card(name: string, isCommander = false): Card {
  return {
    id: name,
    name,
    oracleText: "",
    typeLine: "",
    colors: [],
    colorIdentity: [],
    manaCost: "",
    cmc: 0,
    power: null,
    toughness: null,
    keywords: [],
    imageUri: null,
    isCommander,
  };
}

const DECK: Card[] = [
  card("Atraxa, Praetors' Voice", true),
  card("Sol Ring"),
  card("Doubling Season"),
];

describe("serializeDeck", () => {
  it("lists commanders under a Commander header and re-parses cleanly", () => {
    const text = serializeDeck(DECK);
    const { entries } = parseDecklist(text);
    expect(entries.map((e) => e.name)).toEqual([
      "Atraxa, Praetors' Voice",
      "Sol Ring",
      "Doubling Season",
    ]);
    expect(entries.find((e) => e.name === "Atraxa, Praetors' Voice")?.isCommander).toBe(true);
    expect(entries.find((e) => e.name === "Sol Ring")?.isCommander).toBe(false);
  });

  it("handles a deck with no commander", () => {
    const text = serializeDeck([card("Sol Ring")]);
    expect(parseDecklist(text).entries).toEqual([
      { name: "Sol Ring", quantity: 1, isCommander: false },
    ]);
  });
});

describe("encodeDeck / decodeDeck", () => {
  it("round-trips through a URL-safe token", () => {
    const token = encodeDeck(DECK);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    const decoded = decodeDeck(token);
    expect(parseDecklist(decoded!).entries.map((e) => e.name)).toEqual(
      DECK.map((c) => c.name),
    );
  });

  it("preserves Unicode card names", () => {
    const deck = [card("Lim-Dûl's Vault")];
    expect(decodeDeck(encodeDeck(deck))).toContain("Lim-Dûl's Vault");
  });

  it("returns null for missing or malformed tokens", () => {
    expect(decodeDeck(null)).toBeNull();
    expect(decodeDeck("")).toBeNull();
    expect(decodeDeck("!!!not base64!!!")).toBeNull();
  });
});

describe("share URL", () => {
  it("encodes the deck into a #deck= hash and reads it back", () => {
    const url = buildShareUrl(DECK, "https://example.com/app?x=1#deck=stale");
    expect(url).toMatch(/^https:\/\/example\.com\/app\?x=1#deck=[A-Za-z0-9_-]+$/);
    const hash = url.slice(url.indexOf("#"));
    expect(parseDecklist(readDeckFromHash(hash)!).entries.map((e) => e.name)).toEqual(
      DECK.map((c) => c.name),
    );
  });

  it("returns null when no deck token is present", () => {
    expect(readDeckFromHash("")).toBeNull();
    expect(readDeckFromHash("#other=1")).toBeNull();
  });
});
