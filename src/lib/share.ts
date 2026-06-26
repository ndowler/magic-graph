/**
 * Save & Share (PRD milestone M5).
 *
 * Two lightweight, account-free persistence mechanisms:
 *
 *  1. **Local save** — the last analyzed decklist is mirrored to `localStorage`
 *     so it reappears automatically on the next visit.
 *  2. **Shareable link** — the decklist is encoded into the URL fragment
 *     (`#deck=…`) so a single copied link reproduces the exact same graph for
 *     anyone who opens it. The fragment never hits the server, keeping the
 *     "no account needed" promise from the README.
 *
 * The encode/decode/url helpers are pure so they can be unit-tested without a
 * DOM; the `localStorage` helpers degrade gracefully when storage is
 * unavailable (private mode, disabled cookies, SSR).
 */

const STORAGE_KEY = "magicgraph:lastDeck";
const HASH_PREFIX = "deck=";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encode decklist text to a URL-safe, UTF-8-correct base64 string. */
export function encodeDeck(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

/** Decode a string produced by {@link encodeDeck}; returns null on garbage. */
export function decodeDeck(encoded: string): string | null {
  try {
    return new TextDecoder().decode(base64UrlToBytes(encoded));
  } catch {
    return null;
  }
}

/** Build a shareable absolute URL whose fragment carries the decklist. */
export function buildShareUrl(text: string, base = location.href): string {
  const url = new URL(base);
  url.hash = HASH_PREFIX + encodeDeck(text);
  return url.toString();
}

/** Extract a decklist from a `#deck=…` location hash, or null if absent/invalid. */
export function readDeckFromHash(hash: string): string | null {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!h.startsWith(HASH_PREFIX)) return null;
  return decodeDeck(h.slice(HASH_PREFIX.length));
}

/** Persist the last analyzed decklist locally. No-op if storage is unavailable. */
export function saveDeck(text: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, text);
  } catch {
    /* storage unavailable — sharing/local-save is best-effort, never fatal */
  }
}

/** Read the locally saved decklist, or null if none / storage unavailable. */
export function loadSavedDeck(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
