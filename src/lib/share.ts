import type { Card } from "../types";

/**
 * Deck persistence and read-only sharing (PRD §4.6).
 *
 * A graph is fully reproducible from its decklist: the resolver + engine are
 * deterministic, so we only need to round-trip the list of card names (plus
 * which are commanders) — not the heavy resolved card data. We serialize the
 * deck back into a standard decklist, compress it into a URL-safe token, and
 * stash it in the location hash (`#deck=…`) for sharing or in `localStorage`
 * for "pick up where you left off".
 *
 * The encode/decode core is pure and DOM-free so it is trivial to unit test;
 * the `localStorage`/`location` helpers are guarded for non-browser contexts.
 */

const HASH_KEY = "deck";
const STORAGE_KEY = "magicgraph:lastDeck";

/**
 * Reconstruct a standard decklist from resolved cards. Commanders are written
 * under a `Commander` header so the parser re-flags them on load. The output
 * round-trips cleanly through `parseDecklist`.
 */
export function serializeDeck(cards: Card[]): string {
  const commanders = cards.filter((c) => c.isCommander);
  const rest = cards.filter((c) => !c.isCommander);
  const lines: string[] = [];

  if (commanders.length) {
    lines.push("Commander");
    for (const c of commanders) lines.push(`1 ${c.name}`);
    lines.push("");
  }
  if (rest.length) {
    lines.push("Deck");
    for (const c of rest) lines.push(`1 ${c.name}`);
  }
  return lines.join("\n");
}

/** UTF-8-safe base64url encode (works in browser and Node). */
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Inverse of {@link toBase64Url}. Throws on malformed input. */
function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Encode a deck into a compact, URL-safe token. */
export function encodeDeck(cards: Card[]): string {
  return toBase64Url(serializeDeck(cards));
}

/**
 * Decode a share token back into decklist text. Returns `null` if the token is
 * missing or malformed, so callers can fall back gracefully.
 */
export function decodeDeck(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const text = fromBase64Url(token);
    return text.trim() ? text : null;
  } catch {
    return null;
  }
}

/** Build a full shareable URL with the deck encoded in the location hash. */
export function buildShareUrl(cards: Card[], baseUrl: string): string {
  const token = encodeDeck(cards);
  const base = baseUrl.split("#")[0];
  return `${base}#${HASH_KEY}=${token}`;
}

/** Extract the deck token from a `#deck=…` location hash, or `null`. */
export function readDeckFromHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  return decodeDeck(params.get(HASH_KEY));
}

// --- Browser-only persistence helpers (no-ops outside a DOM) ----------------

/** Persist the raw decklist text for the next visit. */
export function saveDeckLocally(raw: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    /* storage unavailable / quota — non-fatal */
  }
}

/** Load the last saved decklist text, or `null`. */
export function loadDeckLocally(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the deck to load on startup: a `#deck=…` share link wins over the
 * locally saved deck so shared links always open what the sender intended.
 */
export function initialDeck(hash: string): string | null {
  return readDeckFromHash(hash) ?? loadDeckLocally();
}
