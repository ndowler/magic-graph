# Product Requirements Document — MagicGraph

> **MagicGraph** is a web app that turns a Magic: The Gathering Commander (EDH) deck into an interactive **knowledge graph of card interactions**, letting players see how their cards connect, discover hidden synergies, and evaluate how well a candidate card fits before they buy or sleeve it.

- **Status:** Draft v1.0
- **Last updated:** 2026-06-26
- **Owner:** nddowler@gmail.com

---

## 1. Overview

### 1.1 Problem

A Commander deck is 100 singleton cards. The deck's power doesn't come from any one card — it comes from the **web of interactions** between them: shared keywords, triggered abilities that feed each other, tribal payoffs, mana engines, combo lines, and protection packages.

Today players reason about these interactions mostly in their heads or in scattered notes. It's hard to answer questions like:

- "Which cards in my deck actually work with my commander?"
- "Is this card a synergy hub, or a lonely value pile?"
- "If I add *Card X*, how much does it connect to what I already have?"
- "What are the dead cards that don't talk to anything?"

### 1.2 Solution

MagicGraph ingests a decklist, identifies pairwise interactions between cards using a rules-and-data-driven analysis engine, and renders them as an **interactive force-directed graph**. Nodes are cards; edges are interactions weighted by strength. Users can add prospective cards and instantly see how strongly they connect to the existing deck.

### 1.3 Goals

| Goal | Description |
| --- | --- |
| **G1** | Import a Commander deck in under 30 seconds from a paste, file, or deckbuilder URL. |
| **G2** | Surface meaningful card-to-card interactions, not just "both are red." |
| **G3** | Make the graph readable and explorable for a 100-card deck without overwhelming the user. |
| **G4** | Let users test "what if I add this card?" and quantify the fit. |
| **G5** | Help users identify weak links (low-connection cards) and synergy hubs (high-connection cards). |

### 1.4 Non-Goals (v1)

- Not a deck-buying / price-tracking tool (may link out to retailers, no commerce).
- Not a gameplay simulator or probability/odds calculator.
- Not a full deckbuilding suite (no collection management, no playtesting hand draws).
- No multiplayer / pod-level analysis (single deck at a time).
- No account-required social feed; sharing is link-based.

---

## 2. Target Users

| Persona | Description | Primary need |
| --- | --- | --- |
| **The Optimizer** | Experienced EDH player tuning a deck for consistency. | Find dead cards and synergy gaps. |
| **The Brewer** | Loves building new decks around a theme or commander. | Validate that a theme actually connects. |
| **The Newcomer** | New to Commander, overwhelmed by card text. | Understand *why* cards belong together. |
| **The Shopper** | Deciding whether a card is worth acquiring. | See the connection lift before buying. |

---

## 3. User Stories

1. As a player, I can **paste or upload my decklist** and get a graph within seconds.
2. As a player, I can **import from Moxfield / Archidekt / a plain text list** so I don't retype.
3. As a player, I can **see my commander highlighted** as the center of the graph.
4. As a player, I can **click a card** to see its connections, the interaction types, and short explanations.
5. As a player, I can **filter edges by interaction type** (e.g. show only "sacrifice synergy").
6. As a player, I can **add a candidate card** and see how many and how strong its new connections are (a "fit score").
7. As a player, I can **see a list of my least- and most-connected cards** to spot weak links and hubs.
8. As a player, I can **share a read-only link** to my graph.
9. As a player, I can **adjust edge sensitivity** so the graph isn't too noisy or too sparse.

---

## 4. Functional Requirements

### 4.1 Deck Import (G1)

- **FR-1.1** Accept a pasted decklist in standard text formats (`1 Sol Ring`, `1x Sol Ring`, MTGO/Arena export).
- **FR-1.2** Accept a `.txt` / `.dec` file upload.
- **FR-1.3** Accept a Moxfield or Archidekt deck URL and fetch the list via their public API/export.
- **FR-1.4** Detect and label the **commander(s)** (from a `Commander` section, or prompt the user to pick).
- **FR-1.5** Validate the list against a card database (Scryfall) and flag unrecognized / misspelled cards with suggestions.
- **FR-1.6** Handle the singleton 100-card structure but not hard-fail on illegal lists (warn, don't block).

### 4.2 Interaction Analysis Engine (G2)

This is the core differentiator. For every pair of cards, the engine computes zero or more **interaction edges**, each with a `type` and a `weight` (0–1).

- **FR-2.1** Pull structured card data (oracle text, type line, keywords, color identity, mana cost, P/T) from Scryfall.
- **FR-2.2** Detect interaction categories including (extensible):
  - **Tribal** — shared creature types referenced by "lord" effects (e.g. *Elf* matters cards + Elves).
  - **Keyword synergy** — one card grants/cares about a keyword another card has (flying, lifelink, deathtouch, etc.).
  - **Triggered loops** — outputs of one card match triggers of another (ETB ↔ blink, sacrifice ↔ sac-payoff, lifegain ↔ lifegain-payoff, +1/+1 counters ↔ counter payoffs).
  - **Resource engines** — token makers ↔ token payoffs, draw ↔ "whenever you draw," landfall ↔ extra lands, treasure ↔ treasure payoffs.
  - **Combo edges** — known two-card and three-card combos (curated list + heuristic detection).
  - **Protection / enabler** — haste/untap enablers, ramp ↔ expensive payoffs, tutors ↔ key targets.
  - **Color/identity** — weak baseline edge (low weight) so isolated cards aren't fully orphaned.
- **FR-2.3** Each edge stores a human-readable **explanation** string (e.g. "*Blood Artist* drains when *Sakura-Tribe Elder* sacrifices itself").
- **FR-2.4** Edge **weight** is derived from interaction category strength × specificity (a named combo > a tribal match > shared color).
- **FR-2.5** The engine must be **deterministic and explainable** — every edge traces to a rule, not a black box.
- **FR-2.6** (Stretch) Optional LLM-assisted explanation layer to phrase interactions in natural language, gated behind the deterministic engine (LLM annotates, never invents edges).

### 4.3 Graph Visualization (G3)

- **FR-3.1** Render a force-directed graph: nodes = cards, edges = interactions.
- **FR-3.2** **Node** encodes: card name, mana cost / color (node color), type (icon), and **connection degree** (node size).
- **FR-3.3** **Edge** encodes: interaction strength (thickness/opacity) and type (color or style on hover).
- **FR-3.4** Commander node is visually anchored/centered and emphasized.
- **FR-3.5** Hover a node → highlight its neighborhood, dim the rest.
- **FR-3.6** Click a node → side panel with card image, oracle text, and a list of its edges with explanations.
- **FR-3.7** Performance target: smooth interaction (≥ 30 fps pan/zoom) for a 100-node, up-to-~1500-edge graph.
- **FR-3.8** Sensitivity slider: a global weight threshold that hides edges below it (G9).
- **FR-3.9** Filter panel: toggle interaction categories on/off.
- **FR-3.10** Cluster/community detection to color-group synergy clusters (e.g. an aristocrats sub-engine).

### 4.4 Add-a-Card / Fit Score (G4)

- **FR-4.1** Search for any card by name (typeahead against Scryfall).
- **FR-4.2** On selecting a candidate, compute its edges against the **current deck** without committing it.
- **FR-4.3** Display a **Fit Score**: a normalized 0–100 measure combining number of new edges and their total weight, relative to the deck's average node connectivity.
- **FR-4.4** Show the candidate as a **ghost node** with dashed edges so the user sees exactly where it plugs in.
- **FR-4.5** "Add to deck" commits the ghost node; "dismiss" removes it.
- **FR-4.6** Suggest a card to **cut** for it (lowest-connectivity card of comparable role), as an optional recommendation.

### 4.5 Insights & Weak Links (G5)

- **FR-5.1** Ranked list: **most-connected cards** (synergy hubs).
- **FR-5.2** Ranked list: **least-connected cards** (potential cuts), with the caveat that staples (ramp/removal) may legitimately be low-synergy.
- **FR-5.3** Deck-level summary metrics: total edges, average degree, graph density, number of clusters, and an overall **Cohesion Score**.
- **FR-5.4** Flag **orphan cards** with zero interaction edges above threshold.

### 4.6 Sharing & Persistence

- **FR-6.1** Save a deck graph locally (browser storage) without an account.
- **FR-6.2** Generate a shareable read-only URL (encoded decklist or stored snapshot).
- **FR-6.3** (Optional, accounts) Sign in to save multiple decks server-side.

---

## 5. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| **Performance** | Import + full analysis of a 100-card deck in < 5s (cached card data); graph interaction ≥ 30 fps. |
| **Reliability** | Graceful degradation if Scryfall is slow/unavailable (serve from cache, show staleness). |
| **Accessibility** | Keyboard navigable; color is never the only signal (shape/label fallbacks); WCAG AA contrast. |
| **Privacy** | No account required for core flow; decklists stored locally by default. |
| **Scalability** | Card data cached; analysis runs client-side or in a stateless service; horizontally scalable. |
| **Maintainability** | Interaction rules are data-driven and unit-tested; new rules add without code rewrites. |
| **Licensing** | Use Scryfall data per their API guidelines; comply with Wizards of the Coast fan-content policy. No card images rehosted beyond permitted use. |

---

## 6. System Design (high level)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Importers  │────▶│  Card Resolver   │────▶│  Interaction Engine │
│ paste/file/ │     │  (Scryfall +     │     │  (rule modules →    │
│  URL        │     │   local cache)   │     │   weighted edges)   │
└─────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │   Graph Model        │
                                              │  nodes + edges +     │
                                              │  metrics + clusters  │
                                              └──────────┬──────────┘
                                                         │
                            ┌────────────────────────────┼───────────────────────┐
                            ▼                             ▼                       ▼
                   ┌────────────────┐          ┌──────────────────┐    ┌──────────────────┐
                   │ Graph Renderer │          │  Insights Panel  │    │  Add-Card / Fit  │
                   │ (force layout) │          │  hubs / cuts /   │    │  ghost-node sim  │
                   │                │          │  cohesion        │    │                  │
                   └────────────────┘          └──────────────────┘    └──────────────────┘
```

### 6.1 Data model (core)

```
Card        { id, name, oracleText, typeLine, colors, colorIdentity,
              manaCost, cmc, power, toughness, keywords[], producedMana[],
              creatureTypes[], imageUri, scryfallId }

Edge        { sourceId, targetId, type, weight, explanation }

GraphModel  { commanderIds[], nodes: Card[], edges: Edge[],
              metrics: { density, avgDegree, cohesionScore, clusterCount },
              clusters: { [clusterId]: cardId[] } }
```

### 6.2 Suggested stack (proposal, not binding)

- **Frontend:** React + TypeScript; graph via `react-force-graph` / `d3-force` / Cytoscape.js.
- **Card data:** Scryfall bulk data + per-card API, cached (IndexedDB client-side, Redis/SQLite server-side).
- **Analysis engine:** Pure TypeScript rule modules, runnable client-side; optionally a stateless Node service for heavier decks.
- **Persistence/sharing:** URL-encoded snapshots; optional Postgres for accounts.

---

## 7. Interaction Weighting (illustrative)

| Category | Base weight | Notes |
| --- | --- | --- |
| Named combo (infinite/game-ending) | 1.00 | From curated combo DB. |
| Specific triggered loop (sac ↔ payoff) | 0.75 | Output matches trigger. |
| Tribal lord ↔ tribe member | 0.65 | Type line match. |
| Resource engine (token ↔ payoff) | 0.55 | |
| Keyword grant ↔ keyword carer | 0.50 | |
| Enabler (ramp ↔ big payoff) | 0.35 | |
| Shared color identity (baseline) | 0.10 | Prevents total orphans. |

`Fit Score = clamp( Σ(new edge weights) / deckAvgNodeWeight × 100, 0, 100 )`

---

## 8. Milestones

| Milestone | Scope |
| --- | --- |
| **M0 — Spike** | Scryfall fetch + cache; parse a pasted decklist into resolved cards. |
| **M1 — Engine** | First 4 interaction rule modules + edge weighting + unit tests. |
| **M2 — Graph** | Force-directed render, node/edge encodings, click-to-inspect side panel. |
| **M3 — Add-a-Card** | Typeahead search, ghost-node simulation, Fit Score. |
| **M4 — Insights** | Hubs/cuts/orphans lists, cohesion metrics, cluster coloring. |
| **M5 — Share** | Local save + shareable read-only links. |
| **M6 — Polish** | Sensitivity slider, filters, accessibility, performance pass. |

---

## 9. Success Metrics

- **Activation:** % of imports that reach a rendered graph (target > 90%).
- **Engagement:** median nodes clicked per session; % sessions using Add-a-Card.
- **Value:** % of Add-a-Card simulations that lead to "Add to deck."
- **Quality:** user-reported "this interaction is wrong" rate per 1000 edges (target < 1%).
- **Retention:** returning users who re-open or re-import a deck within 30 days.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Interaction engine produces noisy / wrong edges. | Deterministic, explainable rules; per-edge explanations; user feedback flag; tune weights. |
| Graph is unreadable at 100 nodes / 1000+ edges. | Sensitivity threshold, clustering, neighborhood-focus on hover. |
| Scryfall rate limits / downtime. | Bulk-data cache, polite request batching, stale-while-revalidate. |
| Legal/IP (card text & images). | Follow Scryfall API terms + WotC fan content policy; link out rather than rehost where required. |
| Combo DB maintenance burden. | Seed from open combo datasets; allow community submissions in a later phase. |

---

## 11. Open Questions

1. Client-side-only analysis vs. a backend service — where's the line for large/edge-heavy decks?
2. How much should LLM annotation be trusted, and how do we keep it from inventing interactions?
3. Do we support non-Commander formats later, or stay focused on EDH?
4. Accounts in v1, or stay link-share-only until there's demand?
