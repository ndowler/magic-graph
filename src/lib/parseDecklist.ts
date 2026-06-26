import type { DeckEntry, ParsedDecklist } from "../types";

/**
 * Parse a raw decklist into structured entries.
 *
 * Supports the common export formats:
 *   - "1 Sol Ring", "1x Sol Ring", "Sol Ring"
 *   - section headers ("Commander", "Deck", "Sideboard")
 *   - Moxfield-style commander tagging ("1 Atraxa, Praetors' Voice *CMDR*")
 *   - trailing set/collector annotations ("1 Sol Ring (C21) 263")
 *   - "//" or "#" comments
 *
 * The parser is pure and side-effect free so it is trivial to unit test.
 */

const COMMANDER_HEADERS = new Set(["commander", "commanders", "general"]);
const IGNORED_HEADERS = new Set(["sideboard", "maybeboard", "considering", "tokens"]);

/** Strip a trailing "(SET) 123" or "[SET]" style annotation. */
function stripSetAnnotation(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*[\dA-Za-z-]*\s*$/g, "")
    .replace(/\s*\[[^\]]*\]\s*$/g, "")
    .trim();
}

/** Detect and strip commander markers, returning [cleanName, isCommander]. */
function extractCommanderMarker(name: string): [string, boolean] {
  const markers = [/\*cmdr\*/i, /\*commander\*/i, /\bcmdr\b\s*$/i];
  for (const m of markers) {
    if (m.test(name)) {
      return [name.replace(m, "").trim(), true];
    }
  }
  return [name, false];
}

export function parseDecklist(raw: string): ParsedDecklist {
  const entries: DeckEntry[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, DeckEntry>();

  // Section state: cards under a "Commander" header are flagged as commanders;
  // cards under an ignored header (sideboard/maybeboard) are skipped.
  let inCommanderSection = false;
  let inIgnoredSection = false;

  for (const rawLine of raw.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;

    // Comments.
    line = line.replace(/\s*(\/\/|#).*$/, "").trim();
    if (!line) continue;

    // Section header? (a line with no quantity that names a known section)
    const headerKey = line.replace(/[:\s]+$/, "").toLowerCase();
    if (COMMANDER_HEADERS.has(headerKey)) {
      inCommanderSection = true;
      inIgnoredSection = false;
      continue;
    }
    if (IGNORED_HEADERS.has(headerKey)) {
      inIgnoredSection = true;
      inCommanderSection = false;
      continue;
    }
    if (headerKey === "deck" || headerKey === "mainboard" || headerKey === "main") {
      inCommanderSection = false;
      inIgnoredSection = false;
      continue;
    }

    if (inIgnoredSection) continue;

    // "3 Card", "3x Card", "Card"
    const match = line.match(/^(?:(\d+)\s*[xX]?\s+)?(.+)$/);
    if (!match) {
      warnings.push(`Could not parse line: "${rawLine.trim()}"`);
      continue;
    }

    const quantity = match[1] ? parseInt(match[1], 10) : 1;
    let name = match[2].trim();
    const [markerStripped, hasMarker] = extractCommanderMarker(name);
    name = stripSetAnnotation(markerStripped);

    if (!name) {
      warnings.push(`Could not parse line: "${rawLine.trim()}"`);
      continue;
    }

    const isCommander = hasMarker || inCommanderSection;
    const key = name.toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.isCommander = existing.isCommander || isCommander;
    } else {
      const entry: DeckEntry = { name, quantity, isCommander };
      seen.set(key, entry);
      entries.push(entry);
    }
  }

  return { entries, warnings };
}
