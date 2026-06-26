import type { Card } from "../../types";

/**
 * Feature extraction.
 *
 * The interaction engine never reads raw oracle text directly — it reads these
 * derived boolean/list features. Keeping extraction in one place means rules
 * stay declarative and the heuristics are testable in isolation.
 *
 * These are heuristics over oracle text, not a full rules-engine parse. They
 * favour recall (catch real synergies) and accept some false positives, which
 * the edge-weight threshold in the UI lets the user dial out.
 */

/** Common creature types that show up in tribal / "matters" effects. */
export const CREATURE_TYPES = [
  "Elf", "Goblin", "Zombie", "Vampire", "Human", "Soldier", "Wizard",
  "Merfolk", "Dragon", "Angel", "Demon", "Sliver", "Cat", "Dog", "Wolf",
  "Spirit", "Knight", "Cleric", "Rogue", "Warrior", "Beast", "Elemental",
  "Dinosaur", "Hydra", "Snake", "Spider", "Insect", "Faerie", "Giant",
  "Treefolk", "Saproling", "Pirate", "Ninja", "Samurai", "Construct",
  "Golem", "Horror", "Devil", "Druid", "Shaman", "Bird", "Cephalid",
] as const;

/** Keywords we can reason about for grant / cares-about synergies. */
export const SYNERGY_KEYWORDS = [
  "Flying", "Lifelink", "Deathtouch", "Trample", "Menace", "Vigilance",
  "First strike", "Double strike", "Haste", "Hexproof", "Indestructible",
  "Reach", "Flash", "Infect", "Defender",
] as const;

export interface CardFeatures {
  /** Creature subtypes printed on this card. */
  creatureTypes: string[];
  /** Creature types this card buffs / cares about (lord effects). */
  tribalLordTypes: string[];

  sacOutlet: boolean;
  deathPayoff: boolean;

  makesTokens: boolean;
  tokenPayoff: boolean;

  etbTrigger: boolean;
  blink: boolean;

  lifegain: boolean;
  lifegainPayoff: boolean;

  plusCounters: boolean;
  counterPayoff: boolean;

  drawsCards: boolean;
  drawPayoff: boolean;

  treasure: boolean;
  treasurePayoff: boolean;

  ramp: boolean;
  bigPayoff: boolean;

  /** Keywords this card grants to other creatures. */
  keywordsGranted: string[];
  /** Keywords printed on this card. */
  keywordsHave: string[];
  /** Keywords this card cares about on other creatures. */
  keywordCarer: string[];
}

/** Pre-computed features bundled with their card. */
export interface CardWithFeatures {
  card: Card;
  features: CardFeatures;
}

function subtypesFromTypeLine(typeLine: string): string[] {
  // "Legendary Creature — Elf Druid // ..." → ["Elf","Druid"]
  const types: string[] = [];
  for (const part of typeLine.split("//")) {
    if (!/creature/i.test(part)) continue;
    const dash = part.split(/—|–|-/);
    if (dash.length < 2) continue;
    for (const t of dash[1].trim().split(/\s+/)) {
      if (t) types.push(t);
    }
  }
  return [...new Set(types)];
}

function detectTribalLords(oracle: string): string[] {
  const found: string[] = [];
  for (const type of CREATURE_TYPES) {
    // "Goblins you control get", "other Goblins", "Goblin creatures",
    // "whenever a Goblin", "Goblin spells you cast".
    const matters = new RegExp(
      `\\b(other\\s+)?${type}s?\\b[^.]*?(you control|get \\+|gets \\+|enters|dies|spells you|creatures)` +
        `|whenever (a|an|another) ${type}\\b`,
      "i",
    );
    if (matters.test(oracle)) found.push(type);
  }
  return found;
}

const re = (pattern: string) => new RegExp(pattern, "i");

export function extractFeatures(card: Card): CardFeatures {
  const o = card.oracleText ?? "";

  const keywordsHave = SYNERGY_KEYWORDS.filter((k) =>
    card.keywords.some((have) => have.toLowerCase() === k.toLowerCase()),
  );

  const keywordsGranted = SYNERGY_KEYWORDS.filter((k) => {
    const grant = new RegExp(
      `(creatures? you control|other creatures|target creature|each creature)[^.]*\\b${k}\\b` +
        `|gains?\\b[^.]*\\b${k}\\b`,
      "i",
    );
    return grant.test(o);
  });

  const keywordCarer = SYNERGY_KEYWORDS.filter((k) =>
    new RegExp(`creatures? with ${k}\\b|\\b${k}\\b creatures`, "i").test(o),
  );

  return {
    creatureTypes: subtypesFromTypeLine(card.typeLine),
    tribalLordTypes: detectTribalLords(o),

    sacOutlet: re("sacrifice (a|an|another|two|three|x|\\d+)\\s+(creature|artifact|permanent|token|enchantment)").test(o),
    deathPayoff: re("whenever[^.]*\\bdies\\b|whenever[^.]*creature[^.]*dies").test(o),

    makesTokens: re("create[s]?[^.]*token|put[s]?[^.]*token onto the battlefield").test(o),
    tokenPayoff: re("creatures? you control get|whenever a creature enters|for each creature you control|number of creatures you control").test(o),

    etbTrigger: re("when(ever)?[^.]*enters the battlefield").test(o),
    blink: re("exile[^.]*return[^.]*(to the )?battlefield|flicker").test(o),

    lifegain: re("you gain[^.]*life|gain \\d+ life|gains? life").test(o),
    lifegainPayoff: re("whenever you gain life").test(o),

    plusCounters: re("\\+1/\\+1 counter").test(o) && re("put|enters with|with a|with two|distribute").test(o),
    counterPayoff: re("proliferate|for each \\+1/\\+1 counter|for each counter|move a \\+1/\\+1 counter").test(o),

    drawsCards: re("draw[s]? (a card|two cards|three cards|\\w+ cards|that many cards)").test(o),
    drawPayoff: re("whenever you draw").test(o),

    treasure: re("treasure token").test(o),
    treasurePayoff: re("sacrifice an artifact|whenever an artifact|artifacts you control|for each artifact").test(o),

    ramp: re("add \\{|adds? (one|two|three|\\w+) mana|search your library for a[^.]*land|treasure token").test(o),
    bigPayoff: card.cmc >= 6,

    keywordsGranted,
    keywordsHave,
    keywordCarer,
  };
}

export function withFeatures(card: Card): CardWithFeatures {
  return { card, features: extractFeatures(card) };
}
