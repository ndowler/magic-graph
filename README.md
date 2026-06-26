# MagicGraph 🕸️🃏

> Drop in your Magic: The Gathering **Commander** deck and explore it as an interactive **knowledge graph of card interactions** — see how your cards connect, find synergy hubs and dead cards, and test how well a new card fits before you sleeve it.

MagicGraph reads a decklist, figures out *how every pair of cards interacts* (tribal payoffs, sacrifice loops, token engines, keyword grants, known combos, and more), and draws it as a force-directed graph. Bigger nodes are more-connected cards. Thicker edges are stronger interactions. Add a card and watch it light up where it plugs in.

📄 See [`PRD.md`](./PRD.md) for the full product spec.

---

## Why?

A Commander deck is 100 singleton cards, and its strength is the **web of interactions** between them — not any single card. That web is hard to see in your head. MagicGraph makes it visible so you can answer:

- Which cards actually work with my commander?
- Is this card a synergy hub or a lonely value pile?
- If I add *Card X*, how much does it connect to what I already run?
- What are the dead cards that don't talk to anything?

---

## Features

- **Fast import** — paste a decklist, upload a `.txt`/`.dec` file, or import from a Moxfield / Archidekt URL.
- **Interaction graph** — nodes are cards, edges are weighted interactions; your commander sits at the center.
- **Explainable edges** — every connection comes with a plain-English reason ("*Blood Artist* drains when *Sakura-Tribe Elder* sacrifices itself"), traced to a concrete rule — no black box.
- **Add-a-card simulation** — search any card and see it appear as a *ghost node* with a **Fit Score (0–100)** showing how well it connects.
- **Insights** — ranked lists of your most- and least-connected cards, orphan detection, and a deck-wide **Cohesion Score**.
- **Tunable view** — sensitivity slider to cut noise, filters per interaction type, and cluster coloring for sub-engines (aristocrats, tokens, etc.).
- **No account needed** — decks save locally; share a read-only link when you want to.

---

## How it works

```
decklist ──▶ Card Resolver (Scryfall + cache) ──▶ Interaction Engine ──▶ Graph Model ──▶ Interactive UI
                                                   (rule modules →        (nodes, edges,
                                                    weighted edges)        metrics, clusters)
```

1. **Resolve** — each line of your decklist is matched against the Scryfall card database (with misspelling suggestions) and the commander(s) detected.
2. **Analyze** — a set of deterministic rule modules scan every card pair for interactions and emit weighted, explained edges.
3. **Render** — the graph is laid out with a force simulation; node size = connection degree, edge thickness = interaction strength.
4. **Explore** — click cards, filter interaction types, test new cards, and read the insights panel.

### Interaction categories (extensible)

| Category | Example |
| --- | --- |
| Tribal | Elf lords ↔ your Elves |
| Keyword synergy | a card that grants/cares about flying ↔ your fliers |
| Triggered loops | ETB ↔ blink, sacrifice ↔ sac-payoff, lifegain ↔ payoff |
| Resource engines | token makers ↔ token payoffs, treasure ↔ treasure payoffs |
| Known combos | curated two-/three-card combo database |
| Enablers | ramp ↔ expensive payoffs, haste/untap enablers |

Edge weights scale with specificity — a named combo outweighs a tribal match, which outweighs a shared color.

---

## Getting started

> ⚠️ **Status:** Early development. The repository currently contains the product spec ([`PRD.md`](./PRD.md)) and this README; the app implementation is in progress.

The proposed stack:

- **Frontend:** React + TypeScript with a force-directed graph library (`react-force-graph` / Cytoscape.js / `d3-force`).
- **Card data:** [Scryfall](https://scryfall.com/docs/api) bulk data + per-card API, cached locally.
- **Engine:** pure TypeScript rule modules, runnable in the browser.

Once scaffolding lands, the dev flow will look like:

```bash
git clone https://github.com/ndowler/magic-graph.git
cd magic-graph
npm install
npm run dev      # start the local dev server
```

(Commands above are illustrative and will be finalized with the first implementation milestone.)

---

## Example decklist format

MagicGraph accepts the common export formats, e.g.:

```
1 Atraxa, Praetors' Voice   # Commander
1 Sol Ring
1 Doubling Season
1 Hardened Scales
1 Evolution Sage
...
```

`1x Sol Ring` and MTGO/Arena exports work too. A `Commander` header (or an explicit pick) tags your commander.

---

## Roadmap

| Milestone | Scope |
| --- | --- |
| M0 | Scryfall fetch/cache + decklist parsing |
| M1 | Core interaction engine + weighting + tests |
| M2 | Force-directed graph + click-to-inspect |
| M3 | Add-a-card ghost nodes + Fit Score |
| M4 | Insights: hubs / cuts / orphans + cohesion metrics |
| M5 | Local save + shareable links |
| M6 | Sensitivity/filters, accessibility, performance |

See [`PRD.md`](./PRD.md) for details, the data model, and open questions.

---

## Contributing

Interaction rules are intended to be **data-driven and unit-tested**, so adding a new synergy category should not require rewriting the engine. Contribution guidelines will be added alongside the first implementation milestone. Issues and ideas are welcome.

---

## Legal

MagicGraph uses card data from Scryfall under their [API guidelines](https://scryfall.com/docs/api) and follows the Wizards of the Coast [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Magic: The Gathering is © Wizards of the Coast. This is an unofficial fan project and is not affiliated with or endorsed by Wizards of the Coast.
