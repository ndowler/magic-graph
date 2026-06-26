import { useMemo, useState } from "react";
import type { Card, FitResult, GraphNode, InteractionType } from "./types";
import { parseDecklist } from "./lib/parseDecklist";
import { resolveDeck } from "./lib/resolver";
import { resolveSingle } from "./lib/scryfall";
import { buildGraph, computeFit } from "./lib/graph";
import { INTERACTION_LABELS } from "./lib/colors";
import { DeckInput } from "./components/DeckInput";
import { GraphView } from "./components/GraphView";
import { SidePanel } from "./components/SidePanel";
import { Insights } from "./components/Insights";
import { AddCard } from "./components/AddCard";
import { DeckDoctor } from "./components/DeckDoctor";
import { rankAdditions } from "./lib/recommend";

const ALL_TYPES = Object.keys(INTERACTION_LABELS) as InteractionType[];

export function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [threshold, setThreshold] = useState(0.3);
  const [enabledTypes, setEnabledTypes] = useState<Set<InteractionType>>(
    new Set(ALL_TYPES),
  );
  const [ghost, setGhost] = useState<
    { node: GraphNode; links: { source: string; target: string }[] } | null
  >(null);

  const graph = useMemo(() => (cards.length ? buildGraph(cards) : null), [cards]);

  async function handleAnalyze(raw: string) {
    setLoading(true);
    setError(null);
    setSelected(null);
    setGhost(null);
    try {
      const parsed = parseDecklist(raw);
      const resolved = await resolveDeck(parsed);
      setWarnings(resolved.warnings);
      setNotFound(resolved.notFound);
      setCards(resolved.cards);
      if (resolved.cards.length === 0) {
        setError("No cards could be resolved from that list.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze deck.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(name: string): Promise<FitResult | null> {
    if (!graph) return null;
    const card = await resolveSingle(name);
    if (!card) return null;
    const fit = computeFit(card, graph);
    const ghostNode: GraphNode = {
      ...card,
      degree: fit.newEdges.length,
      weightedDegree: fit.newEdges.reduce((s, e) => s + e.weight, 0),
      cluster: -1,
    };
    setGhost({
      node: ghostNode,
      links: fit.newEdges.map((e) => ({
        source: e.sourceId === card.id ? e.targetId : e.sourceId,
        target: card.id,
      })),
    });
    return fit;
  }

  function handleAdd(fit: FitResult) {
    setGhost(null);
    setCards((prev) => [...prev, { ...fit.card, isCommander: false }]);
  }

  async function handleScoreAdditions(raw: string): Promise<FitResult[]> {
    if (!graph) return [];
    const parsed = parseDecklist(raw);
    const resolved = await resolveDeck(parsed);
    return rankAdditions(resolved.cards, graph).map((s) => s.fit);
  }

  function toggleType(t: InteractionType) {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🕸️ MagicGraph</h1>
        <span className="tag">MTG Commander interaction graph</span>
      </header>

      <aside className="left">
        <DeckInput
          loading={loading}
          error={error}
          warnings={warnings}
          notFound={notFound}
          onAnalyze={handleAnalyze}
        />
        {graph && <AddCard onSearch={handleSearch} onAdd={handleAdd} disabled={loading} />}
        {graph && <SidePanel node={selected} graph={graph} onSelect={setSelected} />}
      </aside>

      <main className="graph">
        {graph ? (
          <GraphView
            graph={graph}
            threshold={threshold}
            enabledTypes={enabledTypes}
            onSelect={setSelected}
            ghost={ghost}
          />
        ) : (
          <div className="empty">
            <div>
              <p>Paste a Commander decklist and hit <b>Build graph</b>,</p>
              <p>or load the sample deck to explore.</p>
            </div>
          </div>
        )}
      </main>

      <aside className="right">
        {graph ? (
          <Insights
            graph={graph}
            threshold={threshold}
            setThreshold={setThreshold}
            enabledTypes={enabledTypes}
            toggleType={toggleType}
            onSelect={setSelected}
          />
        ) : (
          <div className="panel">
            <h2>Insights</h2>
            <p className="muted">Cohesion score, synergy hubs, and weak links appear here once you build a graph.</p>
          </div>
        )}
        {graph && (
          <DeckDoctor
            graph={graph}
            onSelect={setSelected}
            onScoreAdditions={handleScoreAdditions}
          />
        )}
      </aside>
    </div>
  );
}
