/**
 * Curated two-card combo database.
 *
 * A small, hand-verified seed set. The PRD's longer-term plan is to grow this
 * from open combo datasets and community submissions; the data shape here is
 * intentionally simple so that's a drop-in expansion.
 */
export interface ComboDef {
  a: string;
  b: string;
  explanation: string;
}

export const COMBOS: ComboDef[] = [
  {
    a: "Thassa's Oracle",
    b: "Demonic Consultation",
    explanation: "Exile your library with Demonic Consultation, then win with Thassa's Oracle's empty-library trigger.",
  },
  {
    a: "Mikaeus, the Unhallowed",
    b: "Triskelion",
    explanation: "Mikaeus + Triskelion is an infinite damage loop via undying and counter removal.",
  },
  {
    a: "Kiki-Jiki, Mirror Breaker",
    b: "Zealous Conscripts",
    explanation: "Kiki-Jiki copies Zealous Conscripts to untap Kiki-Jiki, making infinite hasty tokens.",
  },
  {
    a: "Isochron Scepter",
    b: "Dramatic Reversal",
    explanation: "Imprint Dramatic Reversal; with nonland mana rocks this generates infinite mana.",
  },
  {
    a: "Dockside Extortionist",
    b: "Temur Sabertooth",
    explanation: "Bounce and recast Dockside with Temur Sabertooth for infinite Treasures given enough artifacts/enchantments.",
  },
  {
    a: "Heliod, Sun-Crowned",
    b: "Walking Ballista",
    explanation: "Heliod's lifelink-fed counters on Walking Ballista loop into infinite damage.",
  },
  {
    a: "Sanguine Bond",
    b: "Exquisite Blood",
    explanation: "Sanguine Bond + Exquisite Blood form a life-drain loop that ends the game.",
  },
  {
    a: "Mike, the Unhallowed",
    b: "Walking Ballista",
    explanation: "Undying from Mikaeus lets Walking Ballista return with counters for repeated damage.",
  },
  {
    a: "Deadeye Navigator",
    b: "Peregrine Drake",
    explanation: "Deadeye blinking Peregrine Drake produces infinite mana from the untap-five-lands ETB.",
  },
  {
    a: "Najeela, the Blade-Blossom",
    b: "Derevi, Empyrial Tactician",
    explanation: "Najeela's extra combats + Derevi untapping a Warrior-token engine can loop into infinite combats.",
  },
];

function key(a: string, b: string): string {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()].sort();
  return `${x}|||${y}`;
}

const COMBO_INDEX = new Map<string, ComboDef>();
for (const c of COMBOS) COMBO_INDEX.set(key(c.a, c.b), c);

/** Look up a curated combo for an unordered name pair, if any. */
export function findCombo(nameA: string, nameB: string): ComboDef | undefined {
  return COMBO_INDEX.get(key(nameA, nameB));
}
