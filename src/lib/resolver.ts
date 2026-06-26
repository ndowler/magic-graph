import type { Card, ParsedDecklist } from "../types";
import { resolveCards } from "./scryfall";

export interface ResolvedDeck {
  cards: Card[];
  notFound: string[];
  warnings: string[];
}

/**
 * Resolve a parsed decklist into `Card`s, preserving the commander flags the
 * parser inferred (from a `Commander` section or `*CMDR*` markers).
 *
 * Commander is a singleton format, so we deliberately collapse to one node per
 * unique card name regardless of the (rare) quantity.
 */
export async function resolveDeck(
  parsed: ParsedDecklist,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolvedDeck> {
  const names = parsed.entries.map((e) => e.name);
  const { cards, notFound } = await resolveCards(names, fetchImpl);

  const commanderNames = new Set(
    parsed.entries.filter((e) => e.isCommander).map((e) => e.name.toLowerCase()),
  );

  const flagged = cards.map((c) => ({
    ...c,
    isCommander: commanderNames.has(c.name.toLowerCase()),
  }));

  return { cards: flagged, notFound, warnings: parsed.warnings };
}
