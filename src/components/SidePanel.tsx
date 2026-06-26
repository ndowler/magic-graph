import type { Edge, GraphModel, GraphNode } from "../types";
import { EDGE_COLORS, INTERACTION_LABELS } from "../lib/colors";

interface Props {
  node: GraphNode | null;
  graph: GraphModel;
  onSelect: (node: GraphNode) => void;
}

export function SidePanel({ node, graph, onSelect }: Props) {
  if (!node) {
    return (
      <div className="panel">
        <h2>Card</h2>
        <p className="muted">Click a node to inspect a card and its interactions.</p>
      </div>
    );
  }

  const edges = graph.edges.filter(
    (e) => e.sourceId === node.id || e.targetId === node.id,
  );
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const otherOf = (e: Edge) => byId.get(e.sourceId === node.id ? e.targetId : e.sourceId);

  return (
    <div className="panel card-detail">
      <h2>{node.name}</h2>
      {node.imageUri && <img src={node.imageUri} alt={node.name} />}
      <p className="muted">{node.typeLine}</p>
      <p className="muted">
        {edges.length} connection(s) · weighted {node.weightedDegree.toFixed(2)}
      </p>

      {edges
        .sort((a, b) => b.weight - a.weight)
        .map((e, i) => {
          const other = otherOf(e);
          return (
            <div className="edge-item" key={i}>
              <span className="swatch" style={{ background: EDGE_COLORS[e.type] }} />
              <span className="type">{INTERACTION_LABELS[e.type]}</span>{" "}
              <span className="muted">({e.weight.toFixed(2)})</span>
              <div>{e.explanation}</div>
              {other && (
                <button
                  className="secondary"
                  style={{ marginTop: 6, padding: "4px 8px", fontSize: 11 }}
                  onClick={() => onSelect(other)}
                >
                  → {other.name}
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
}
