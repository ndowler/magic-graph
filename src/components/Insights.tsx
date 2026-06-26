import type { GraphModel, GraphNode, InteractionType } from "../types";
import { rankByConnectivity, orphans } from "../lib/graph";
import { EDGE_COLORS, INTERACTION_LABELS } from "../lib/colors";

const ALL_TYPES = Object.keys(INTERACTION_LABELS) as InteractionType[];

interface Props {
  graph: GraphModel;
  threshold: number;
  setThreshold: (v: number) => void;
  enabledTypes: Set<InteractionType>;
  toggleType: (t: InteractionType) => void;
  onSelect: (node: GraphNode) => void;
}

export function Insights({
  graph,
  threshold,
  setThreshold,
  enabledTypes,
  toggleType,
  onSelect,
}: Props) {
  const ranked = rankByConnectivity(graph);
  const hubs = ranked.slice(0, 6);
  const deadCards = orphans(graph);
  const m = graph.metrics;

  return (
    <div className="panel">
      <h2>Deck cohesion</h2>
      <div className="cohesion">{m.cohesionScore}</div>
      <div className="metric-grid" style={{ marginTop: 10 }}>
        <div className="metric">
          <div className="value">{m.edgeCount}</div>
          <div className="label">interactions</div>
        </div>
        <div className="metric">
          <div className="value">{m.avgDegree.toFixed(1)}</div>
          <div className="label">avg connections</div>
        </div>
        <div className="metric">
          <div className="value">{m.clusterCount}</div>
          <div className="label">synergy clusters</div>
        </div>
        <div className="metric">
          <div className="value">{(m.density * 100).toFixed(1)}%</div>
          <div className="label">density</div>
        </div>
      </div>

      <h2 style={{ marginTop: 18 }}>Edge sensitivity</h2>
      <div className="slider-row">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
        />
        <span>≥ {threshold.toFixed(2)}</span>
      </div>

      <h2 style={{ marginTop: 18 }}>Interaction types</h2>
      <div className="legend">
        {ALL_TYPES.map((t) => (
          <label key={t}>
            <input type="checkbox" checked={enabledTypes.has(t)} onChange={() => toggleType(t)} />
            <span className="swatch" style={{ background: EDGE_COLORS[t] }} />
            {INTERACTION_LABELS[t]}
          </label>
        ))}
      </div>

      <h2 style={{ marginTop: 18 }}>Synergy hubs</h2>
      <ul className="list">
        {hubs.map((n) => (
          <li key={n.id} onClick={() => onSelect(n)}>
            <span>{n.name}</span>
            <span className="deg">{n.weightedDegree.toFixed(1)}</span>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 18 }}>Weak links {deadCards.length > 0 && `(${deadCards.length})`}</h2>
      {deadCards.length === 0 ? (
        <p className="muted">No orphan cards — everything connects to something.</p>
      ) : (
        <ul className="list">
          {deadCards.map((n) => (
            <li key={n.id} onClick={() => onSelect(n)}>
              <span>{n.name}</span>
              <span className="deg">0</span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted" style={{ marginTop: 8 }}>
        Staples like ramp and removal can be legitimately low-synergy.
      </p>
    </div>
  );
}
