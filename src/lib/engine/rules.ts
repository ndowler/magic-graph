import type { Edge, InteractionType } from "../../types";
import type { CardWithFeatures } from "./features";
import { BASE_WEIGHTS } from "./weights";
import { findCombo } from "./combos";

/**
 * A rule inspects an unordered pair of cards and emits zero or more edges.
 * Each rule is responsible for both directions of any asymmetric relationship.
 */
export type Rule = (a: CardWithFeatures, b: CardWithFeatures) => Edge[];

function edge(
  source: CardWithFeatures,
  target: CardWithFeatures,
  type: InteractionType,
  explanation: string,
  weightMultiplier = 1,
): Edge {
  return {
    sourceId: source.card.id,
    targetId: target.card.id,
    type,
    weight: Math.min(1, BASE_WEIGHTS[type] * weightMultiplier),
    explanation,
  };
}

const combo: Rule = (a, b) => {
  const def = findCombo(a.card.name, b.card.name);
  if (!def) return [];
  return [edge(a, b, "combo", def.explanation)];
};

const tribal: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (lord: CardWithFeatures, member: CardWithFeatures) => {
    for (const type of lord.features.tribalLordTypes) {
      if (member.features.creatureTypes.includes(type)) {
        out.push(
          edge(lord, member, "tribal",
            `${lord.card.name} rewards ${type}s like ${member.card.name}.`),
        );
        break;
      }
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const sacrifice: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (engine: CardWithFeatures, fuel: CardWithFeatures) => {
    // A sac outlet or death payoff pairs with something that supplies bodies.
    if ((engine.features.sacOutlet || engine.features.deathPayoff) && fuel.features.makesTokens) {
      out.push(
        edge(engine, fuel, "triggered-loop",
          `${fuel.card.name} supplies bodies for ${engine.card.name}'s sacrifice/death payoff.`),
      );
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const blink: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (flicker: CardWithFeatures, etb: CardWithFeatures) => {
    if (flicker.features.blink && etb.features.etbTrigger) {
      out.push(
        edge(flicker, etb, "triggered-loop",
          `${flicker.card.name} can re-trigger ${etb.card.name}'s enter-the-battlefield ability.`),
      );
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const lifegain: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (gain: CardWithFeatures, payoff: CardWithFeatures) => {
    if (gain.features.lifegain && payoff.features.lifegainPayoff) {
      out.push(
        edge(payoff, gain, "triggered-loop",
          `${gain.card.name}'s lifegain triggers ${payoff.card.name}.`),
      );
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const counters: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (source: CardWithFeatures, payoff: CardWithFeatures) => {
    if (source.features.plusCounters && payoff.features.counterPayoff) {
      out.push(
        edge(payoff, source, "resource-engine",
          `${payoff.card.name} capitalises on the +1/+1 counters from ${source.card.name}.`),
      );
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const tokens: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (maker: CardWithFeatures, payoff: CardWithFeatures) => {
    if (maker.features.makesTokens && payoff.features.tokenPayoff) {
      out.push(
        edge(payoff, maker, "resource-engine",
          `${payoff.card.name} scales with the tokens ${maker.card.name} produces.`),
      );
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const draw: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (drawer: CardWithFeatures, payoff: CardWithFeatures) => {
    if (drawer.features.drawsCards && payoff.features.drawPayoff) {
      out.push(
        edge(payoff, drawer, "resource-engine",
          `${payoff.card.name} rewards the extra card draw from ${drawer.card.name}.`),
      );
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const treasure: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (maker: CardWithFeatures, payoff: CardWithFeatures) => {
    if (maker.features.treasure && payoff.features.treasurePayoff) {
      out.push(
        edge(payoff, maker, "resource-engine",
          `${payoff.card.name} uses the Treasures from ${maker.card.name} as fuel.`),
      );
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const keyword: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (grantor: CardWithFeatures, receiver: CardWithFeatures) => {
    // Grantor gives a keyword that the receiver cares about, or grantor cares
    // about a keyword the receiver already has.
    for (const k of grantor.features.keywordsGranted) {
      if (receiver.features.keywordCarer.includes(k)) {
        out.push(
          edge(grantor, receiver, "keyword-synergy",
            `${grantor.card.name} grants ${k}, which ${receiver.card.name} cares about.`),
        );
        return;
      }
    }
    for (const k of grantor.features.keywordCarer) {
      if (receiver.features.keywordsHave.includes(k)) {
        out.push(
          edge(grantor, receiver, "keyword-synergy",
            `${grantor.card.name} cares about ${k}, which ${receiver.card.name} has.`),
        );
        return;
      }
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

const enabler: Rule = (a, b) => {
  const out: Edge[] = [];
  const link = (ramp: CardWithFeatures, payoff: CardWithFeatures) => {
    if (ramp.features.ramp && payoff.features.bigPayoff) {
      out.push(
        edge(ramp, payoff, "enabler",
          `${ramp.card.name} helps cast the high-cost ${payoff.card.name} ahead of curve.`),
      );
    }
  };
  link(a, b);
  link(b, a);
  return out;
};

export const RULES: Rule[] = [
  combo,
  tribal,
  sacrifice,
  blink,
  lifegain,
  counters,
  tokens,
  draw,
  treasure,
  keyword,
  enabler,
];
