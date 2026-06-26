import { useMemo, useState } from "react";
import type { FitResult, GraphModel, GraphNode } from "../types";
import {
  buildSwaps,
  cutCandidates,
  deckObservations,
  type AdditionSuggestion,
} from "../lib/recommend";

interface Props {
  graph: GraphModel;
  onSelect: (node: GraphNode) => void;
  /** Resolve + score a pasted maybeboard against the deck (network-backed). */
  onScoreAdditions: (raw: string) => Promise<FitResult[]>;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: "#d4452f",
  medium: "#d9a441",
  low: "#9aa0ad",
};

export function DeckDoctor({ graph, onSelect, onScoreAdditions }: Props) {
  const cuts = useMemo(() => cutCandidates(graph), [graph]);
  const observations = useMemo(() => deckObservations(graph), [graph]);

  const [maybeboard, setMaybeboard] = useState("");
  const [busy, setBusy] = useState(false);
  const [scored, setScored] = useState<AdditionSuggestion[] | null>(null);

  async function handleScore() {
    if (!maybeboard.trim()) return;
    setBusy(true);
    const fits = await onScoreAdditions(maybeboard);
    setScored(fits.map((fit) => ({ fit })));
    setBusy(false);
  }

  const swaps = scored ? buildSwaps(cuts, scored) : [];

  return (
    <div className="panel">
      <h2>🩺 Deck Doctor</h2>

      {observations.length > 0 && (
        <ul className="obs-list">
          {observations.map((o, i) => (
            <li key={i} className={`obs obs-${o.kind}`}>
              {o.text}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: 18 }}>
        Cut candidates {cuts.length > 0 && `(${cuts.length})`}
      </h2>
      {cuts.length === 0 ? (
        <p className="muted">Nothing obviously weak — every card pulls its weight.</p>
      ) : (
        <ul className="list">
          {cuts.map((c) => (
            <li key={c.node.id} onClick={() => onSelect(c.node)}>
              <span>
                <span
                  className="swatch"
                  style={{ background: SEVERITY_COLOR[c.severity] }}
                />
                {c.node.name}
              </span>
              <span className="deg">{c.synergyEdges}🔗</span>
            </li>
          ))}
        </ul>
      )}
      {cuts.length > 0 && <p className="muted" style={{ marginTop: 6 }}>{cuts[0].reason}</p>}
      <p className="muted" style={{ marginTop: 6 }}>
        Staples like ramp and removal can be legitimately low-synergy.
      </p>

      <h2 style={{ marginTop: 18 }}>Suggest additions</h2>
      <p className="muted" style={{ marginBottom: 8 }}>
        Paste a maybeboard / sideboard and we'll rank how well each card fits.
      </p>
      <textarea
        style={{ minHeight: 90 }}
        placeholder={"Pitiless Plunderer\nBlood Artist\nZulaport Cutthroat"}
        value={maybeboard}
        onChange={(e) => setMaybeboard(e.target.value)}
      />
      <div className="row">
        <button onClick={handleScore} disabled={busy || !maybeboard.trim()}>
          {busy ? "Scoring…" : "Rank candidates"}
        </button>
      </div>

      {scored && scored.length === 0 && (
        <p className="muted" style={{ marginTop: 8 }}>
          None of those cards form new interactions with this deck.
        </p>
      )}

      {scored && scored.length > 0 && (
        <>
          <ul className="list" style={{ marginTop: 8 }}>
            {scored.map(({ fit }) => (
              <li key={fit.card.id} title={fit.newEdges[0]?.explanation}>
                <span>{fit.card.name}</span>
                <span className="deg">
                  {fit.fitScore} · {fit.newEdges.length}🔗
                </span>
              </li>
            ))}
          </ul>

          {swaps.length > 0 && (
            <>
              <h2 style={{ marginTop: 18 }}>Suggested swaps</h2>
              {swaps.map((s, i) => (
                <div className="edge-item" key={i}>
                  <span className="type">−</span> {s.cut.name}{" "}
                  <span className="type">→ +</span> {s.add.name}{" "}
                  <span className="muted">(fit {s.fitScore})</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
