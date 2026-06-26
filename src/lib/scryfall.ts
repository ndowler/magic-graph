import type { Card } from "../types";

/**
 * Minimal Scryfall client.
 *
 * Uses the `/cards/collection` endpoint to resolve many names in one request
 * (max 75 identifiers per call, per Scryfall's API). Results are memoized in a
 * module-level cache and, in the browser, persisted to localStorage so repeat
 * lookups are instant and we stay polite to Scryfall.
 *
 * See https://scryfall.com/docs/api for terms of use.
 */

const SCRYFALL_COLLECTION = "https://api.scryfall.com/cards/collection";
const SCRYFALL_NAMED = "https://api.scryfall.com/cards/named";
const BATCH_SIZE = 75;
const CACHE_PREFIX = "magicgraph:card:";

/** Shape of the bits of a Scryfall card object we consume. */
interface ScryfallCard {
  id: string;
  name: string;
  oracle_text?: string;
  type_line?: string;
  colors?: string[];
  color_identity?: string[];
  mana_cost?: string;
  cmc?: number;
  power?: string;
  toughness?: string;
  keywords?: string[];
  image_uris?: { normal?: string; small?: string };
  card_faces?: Array<{
    oracle_text?: string;
    type_line?: string;
    colors?: string[];
    mana_cost?: string;
    power?: string;
    toughness?: string;
    image_uris?: { normal?: string; small?: string };
  }>;
}

const memCache = new Map<string, Card>();

function cacheKey(name: string): string {
  return name.trim().toLowerCase();
}

function readPersisted(name: string): Card | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(CACHE_PREFIX + cacheKey(name));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Card;
  } catch {
    return null;
  }
}

function writePersisted(name: string, card: Card): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_PREFIX + cacheKey(name), JSON.stringify(card));
  } catch {
    /* storage full or unavailable — ignore, mem cache still serves */
  }
}

/** Normalize a Scryfall card (incl. double-faced cards) into our flat `Card`. */
export function mapScryfallCard(sc: ScryfallCard, isCommander = false): Card {
  const faces = sc.card_faces ?? [];
  const oracleText =
    sc.oracle_text ?? faces.map((f) => f.oracle_text ?? "").join("\n//\n").trim();
  const typeLine = sc.type_line ?? faces.map((f) => f.type_line ?? "").join(" // ");
  const imageUri =
    sc.image_uris?.normal ?? faces[0]?.image_uris?.normal ?? null;

  return {
    id: sc.id,
    name: sc.name,
    oracleText,
    typeLine,
    colors: sc.colors ?? faces.flatMap((f) => f.colors ?? []),
    colorIdentity: sc.color_identity ?? [],
    manaCost: sc.mana_cost ?? faces.map((f) => f.mana_cost ?? "").join(" // "),
    cmc: sc.cmc ?? 0,
    power: sc.power ?? faces[0]?.power ?? null,
    toughness: sc.toughness ?? faces[0]?.toughness ?? null,
    keywords: sc.keywords ?? [],
    imageUri,
    isCommander,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface ResolveResult {
  cards: Card[];
  /** Names Scryfall could not match. */
  notFound: string[];
}

/**
 * Resolve a list of card names to `Card`s, using the cache where possible and
 * batching the remainder to Scryfall's collection endpoint.
 *
 * `fetchImpl` is injectable so tests can run without network access.
 */
export async function resolveCards(
  names: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<ResolveResult> {
  const cards: Card[] = [];
  const notFound: string[] = [];
  const toFetch: string[] = [];

  for (const name of names) {
    const key = cacheKey(name);
    const cached = memCache.get(key) ?? readPersisted(name);
    if (cached) {
      memCache.set(key, cached);
      cards.push(cached);
    } else {
      toFetch.push(name);
    }
  }

  for (const batch of chunk(toFetch, BATCH_SIZE)) {
    const res = await fetchImpl(SCRYFALL_COLLECTION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: batch.map((name) => ({ name })) }),
    });
    if (!res.ok) {
      throw new Error(`Scryfall request failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as {
      data: ScryfallCard[];
      not_found?: Array<{ name?: string }>;
    };
    for (const sc of json.data) {
      const card = mapScryfallCard(sc);
      memCache.set(cacheKey(card.name), card);
      writePersisted(card.name, card);
      cards.push(card);
    }
    for (const nf of json.not_found ?? []) {
      if (nf.name) notFound.push(nf.name);
    }
  }

  return { cards, notFound };
}

/** Fuzzy-resolve a single card name (used by the add-a-card typeahead). */
export async function resolveSingle(
  name: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Card | null> {
  const cached = memCache.get(cacheKey(name)) ?? readPersisted(name);
  if (cached) return cached;
  const res = await fetchImpl(`${SCRYFALL_NAMED}?fuzzy=${encodeURIComponent(name)}`);
  if (!res.ok) return null;
  const sc = (await res.json()) as ScryfallCard;
  const card = mapScryfallCard(sc);
  memCache.set(cacheKey(card.name), card);
  writePersisted(card.name, card);
  return card;
}
