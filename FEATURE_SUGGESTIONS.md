# MagicGraph — Feature Suggestions

Three proposed features for [MagicGraph](./README.md), the MTG Commander
interaction-graph app. Each is grounded in the current architecture
(`src/lib/engine/`, `src/lib/graph.ts`, `src/components/`) and aims to build on
what already exists rather than replace it.

---

## 1. Deck Doctor — actionable upgrade & cut recommendations

**What it is**

A panel that turns the existing graph metrics into concrete, ranked advice:

- **Cut these cards** — surface `orphans()` (cards whose only edges are
  `color-identity` baselines) and the lowest-`weightedDegree` nodes, with the
  plain-English reason they're underperforming.
- **Add these cards** — for each weak engine, suggest cards that would score
  high on the existing **Fit Score** (`computeFit`), so the user gets specific
  swap candidates, not just "this card is bad."
- **Swap pairs** — present cut + add together ("Replace *X* with *Y*: +18 fit,
  reinforces your tokens cluster").

**Why it fits**

The hard parts already exist: `orphans()`, `rankByConnectivity()`, and
`computeFit()` in `src/lib/graph.ts` already produce everything needed. This
feature is mostly a new component that composes them into recommendations and a
small candidate pool to score against (a curated staples list, or the user's
sideboard/maybeboard pasted in).

**Rough scope**

- `src/lib/recommend.ts` — combine orphans + fit scoring into ranked suggestions.
- `src/components/DeckDoctor.tsx` — new collapsible panel in the right sidebar.
- Reuse `INTERACTION_LABELS` and existing edge explanations for the "why."

---

## 2. Deck comparison & A/B graph diff

**What it is**

Let the user hold two deck states side by side and see what changed:

- Compare two pasted lists, or snapshot the current deck before testing edits.
- A **diff view** highlighting added/removed nodes and edges, with deltas on the
  headline metrics (Cohesion Score, cluster count, orphan fraction).
- "This change added 7 synergy edges and lifted cohesion 64 → 71, but orphaned
  *Card Z*."

**Why it fits**

`buildGraph()` already returns a complete, comparable `GraphModel` with
`metrics` (`src/lib/graph.ts:70`). Two models can be diffed by node id and edge
key with no engine changes. The current "add-a-card ghost node" flow is a
one-card preview of exactly this idea — generalizing it to full-deck diffs is a
natural next step and pairs well with the M5 save/share roadmap item.

**Rough scope**

- `src/lib/diffGraph.ts` — set-diff nodes/edges by id, compute metric deltas.
- `src/components/DeckCompare.tsx` — two-column input + diff summary.
- Optional: color added/removed nodes in `GraphView` instead of a separate view.

---

## 3. Persistent decks, snapshots & shareable links (Roadmap M5)

**What it is**

Make decks survive a refresh and travel between people:

- **Save / load** named decks to `localStorage` (the Scryfall cache already
  lives there per the README).
- **Snapshots** — keep a small history so users can revert after experimenting
  (and feed feature #2 above).
- **Shareable read-only links** — encode the decklist into the URL (compressed
  hash) so no backend is required; opening the link rebuilds the graph locally.

**Why it fits**

This is M5 on the existing roadmap and currently the deck lives only in `App`
component state (`useState<Card[]>` in `src/App.tsx:17`) — refreshing loses
everything. Because the engine is pure and deterministic, sharing only needs to
transport the decklist text; the recipient regenerates the identical graph.
No accounts, no server.

**Rough scope**

- `src/lib/storage.ts` — save/load/list named decks + snapshot ring buffer.
- URL hash codec (decklist → compressed base64 → `#deck=...`), parsed on load.
- `src/components/DeckLibrary.tsx` — saved-deck list + "Copy share link" button.

---

### Suggested priority

| Feature | Effort | User value | Notes |
| --- | --- | --- | --- |
| 3. Persistence & sharing | Low–Med | High | Already on roadmap (M5); unblocks demos & retention. |
| 1. Deck Doctor | Med | High | Highest "wow"; reuses existing metrics. |
| 2. Deck comparison/diff | Med | Med–High | Best after persistence (snapshots feed it). |

A natural order is **3 → 1 → 2**: persistence first (so work isn't lost and
links can be shared), then the recommendation engine, then full-deck diffing
built on snapshots.
