import type { Card } from "../types";

/**
 * Sharing & persistence (M5).
 *
 * A graph is fully determined by the resolved cards, which are in turn fully
 * determined by the (card name, isCommander) pairs of a decklist. So both
 * "save locally" and "share via link" reduce to serializing a minimal decklist
 * and re-resolving it later — no need to persist the (large, Scryfall-derived)
 * card or graph objects, which keeps storage small and links portable.
 */

const SHARE_VERSION = "1";

/** localStorage keys. Namespaced so we never collide with other apps on the origin. */
const SAVED_DECKS_KEY = "magicgraph:decks";
const LAST_DECK_KEY = "magicgraph:last";

export interface SavedDeck {
  /** User-supplied name, or an auto-generated one (commander / card count). */
  name: string;
  /** Minimal decklist text, ready to feed back through parse + resolve. */
  decklist: string;
  /** Epoch millis of last save; used to sort most-recent-first. */
  savedAt: number;
}

/**
 * Reconstruct a minimal decklist from resolved cards. Commander is singleton,
 * so every line is quantity 1; commanders get a `*CMDR*` marker the parser
 * understands. This round-trips cleanly through `parseDecklist`.
 */
export function cardsToDecklist(cards: Card[]): string {
  return cards
    .map((c) => (c.isCommander ? `1 ${c.name} *CMDR*` : `1 ${c.name}`))
    .join("\n");
}

/** Base64url-encode a UTF-8 string (URL-safe, unpadded). */
function b64urlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Inverse of {@link b64urlEncode}. Throws on malformed input. */
function b64urlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Encode a decklist into a compact, URL-safe token. Versioned so we can change
 * the encoding later without misreading old links.
 */
export function encodeDecklist(decklist: string): string {
  return `${SHARE_VERSION}.${b64urlEncode(decklist)}`;
}

/** Decode a share token back into a decklist, or null if it isn't one we understand. */
export function decodeDecklist(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const version = token.slice(0, dot);
  if (version !== SHARE_VERSION) return null;
  try {
    return b64urlDecode(token.slice(dot + 1));
  } catch {
    return null;
  }
}

/** Build a full shareable URL for a deck, encoding the list into the hash. */
export function buildShareUrl(cards: Card[], base: string): string {
  const token = encodeDecklist(cardsToDecklist(cards));
  const clean = base.split("#")[0];
  return `${clean}#deck=${token}`;
}

/** Extract and decode a shared decklist from a URL hash, or null if absent/invalid. */
export function readSharedDecklist(hash: string): string | null {
  const match = /[#&]deck=([^&]+)/.exec(hash);
  if (!match) return null;
  return decodeDecklist(decodeURIComponent(match[1]));
}

/** A friendly default name for a deck: its commander(s), else a card count. */
export function suggestDeckName(cards: Card[]): string {
  const commanders = cards.filter((c) => c.isCommander).map((c) => c.name);
  if (commanders.length) return commanders.join(" + ");
  if (cards.length) return `${cards.length}-card deck`;
  return "Untitled deck";
}

// --- localStorage helpers -------------------------------------------------
//
// All reads are defensive: storage may be unavailable (private mode, quota,
// disabled) or hold corrupt data. We never throw out of these — the app should
// degrade to "no saved decks" rather than crash.

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Load all saved decks, most recently saved first. */
export function loadSavedDecks(): SavedDeck[] {
  const raw = safeGet(SAVED_DECKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (d): d is SavedDeck =>
          d && typeof d.name === "string" && typeof d.decklist === "string",
      )
      .map((d) => ({ ...d, savedAt: typeof d.savedAt === "number" ? d.savedAt : 0 }))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/**
 * Save (or overwrite, by name) a deck. Returns the updated list, or null if
 * persistence failed. `now` is injected so callers/tests control the clock.
 */
export function saveDeck(name: string, decklist: string, now: number): SavedDeck[] | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const decks = loadSavedDecks().filter((d) => d.name !== trimmed);
  decks.unshift({ name: trimmed, decklist, savedAt: now });
  if (!safeSet(SAVED_DECKS_KEY, JSON.stringify(decks))) return null;
  return decks;
}

/** Delete a saved deck by name; returns the updated list. */
export function deleteDeck(name: string): SavedDeck[] {
  const decks = loadSavedDecks().filter((d) => d.name !== name);
  safeSet(SAVED_DECKS_KEY, JSON.stringify(decks));
  return decks;
}

/** Auto-persist the current deck so a refresh restores the last session. */
export function saveLastDeck(decklist: string): void {
  safeSet(LAST_DECK_KEY, decklist);
}

/** Read the auto-persisted deck from a previous session, if any. */
export function loadLastDeck(): string | null {
  const v = safeGet(LAST_DECK_KEY);
  return v && v.trim() ? v : null;
}
