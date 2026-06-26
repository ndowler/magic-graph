import { beforeEach, describe, expect, it } from "vitest";
import type { Card } from "../types";
import {
  buildShareUrl,
  cardsToDecklist,
  decodeDecklist,
  deleteDeck,
  encodeDecklist,
  loadLastDeck,
  loadSavedDecks,
  readSharedDecklist,
  saveDeck,
  saveLastDeck,
  suggestDeckName,
} from "./share";

function card(name: string, isCommander = false): Card {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
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

/** Minimal in-memory localStorage so the node test env can exercise persistence. */
function installFakeStorage(): void {
  let store: Record<string, string> = {};
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe("cardsToDecklist", () => {
  it("emits singleton lines and marks commanders", () => {
    const list = cardsToDecklist([card("Atraxa, Praetors' Voice", true), card("Sol Ring")]);
    expect(list).toBe("1 Atraxa, Praetors' Voice *CMDR*\n1 Sol Ring");
  });
});

describe("encode/decode decklist", () => {
  it("round-trips a decklist including unicode and apostrophes", () => {
    const list = "1 Atraxa, Praetors' Voice *CMDR*\n1 Æther Vial\n1 Lim-Dûl's Vault";
    expect(decodeDecklist(encodeDecklist(list))).toBe(list);
  });

  it("rejects tokens with an unknown version or bad payload", () => {
    expect(decodeDecklist("9.abc")).toBeNull();
    expect(decodeDecklist("no-version-dot")).toBeNull();
    expect(decodeDecklist("1.!!!not-base64!!!")).toBeNull();
  });
});

describe("share urls", () => {
  it("builds a hash link that decodes back to the deck", () => {
    const cards = [card("Krenko, Mob Boss", true), card("Goblin Bombardment")];
    const url = buildShareUrl(cards, "https://example.com/app#deck=stale");
    expect(url.startsWith("https://example.com/app#deck=")).toBe(true);
    expect(readSharedDecklist(new URL(url).hash)).toBe(cardsToDecklist(cards));
  });

  it("returns null when no deck param is present", () => {
    expect(readSharedDecklist("#foo=bar")).toBeNull();
    expect(readSharedDecklist("")).toBeNull();
  });
});

describe("suggestDeckName", () => {
  it("prefers commander names", () => {
    expect(suggestDeckName([card("Krenko, Mob Boss", true), card("Sol Ring")])).toBe(
      "Krenko, Mob Boss",
    );
  });
  it("falls back to a card count", () => {
    expect(suggestDeckName([card("Sol Ring"), card("Forest")])).toBe("2-card deck");
  });
});

describe("local persistence", () => {
  beforeEach(installFakeStorage);

  it("saves, lists newest-first, and overwrites by name", () => {
    saveDeck("Aggro", "1 Sol Ring", 100);
    saveDeck("Control", "1 Counterspell", 200);
    let decks = loadSavedDecks();
    expect(decks.map((d) => d.name)).toEqual(["Control", "Aggro"]);

    decks = saveDeck("Aggro", "1 Lightning Bolt", 300)!;
    expect(decks).toHaveLength(2);
    expect(decks[0]).toMatchObject({ name: "Aggro", decklist: "1 Lightning Bolt" });
  });

  it("rejects blank names", () => {
    expect(saveDeck("   ", "1 Sol Ring", 1)).toBeNull();
  });

  it("deletes by name", () => {
    saveDeck("Keep", "1 Forest", 1);
    saveDeck("Drop", "1 Island", 2);
    expect(deleteDeck("Drop").map((d) => d.name)).toEqual(["Keep"]);
  });

  it("round-trips the auto-saved last deck", () => {
    expect(loadLastDeck()).toBeNull();
    saveLastDeck("1 Sol Ring");
    expect(loadLastDeck()).toBe("1 Sol Ring");
  });

  it("ignores corrupt saved-deck JSON", () => {
    localStorage.setItem("magicgraph:decks", "{not json");
    expect(loadSavedDecks()).toEqual([]);
  });
});
