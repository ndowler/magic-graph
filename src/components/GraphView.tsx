import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphModel, GraphNode, InteractionType } from "../types";
import { cardColor, EDGE_COLORS } from "../lib/colors";

interface Props {
  graph: GraphModel;
  threshold: number;
  enabledTypes: Set<InteractionType>;
  onSelect: (node: GraphNode) => void;
  ghost?: { node: GraphNode; links: { source: string; target: string }[] } | null;
}

interface FGNode {
  id: string;
  name: string;
  color: string;
  val: number;
  isCommander: boolean;
  ghost?: boolean;
  ref: GraphNode;
}

interface FGLink {
  source: string;
  target: string;
  color: string;
  width: number;
  ghost?: boolean;
}

export function GraphView({ graph, threshold, enabledTypes, onSelect, ghost }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const nodes: FGNode[] = graph.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      color: cardColor(n.colors, n.colorIdentity),
      val: 2 + n.weightedDegree * 1.5,
      isCommander: n.isCommander,
      ref: n,
    }));

    const links: FGLink[] = graph.edges
      .filter((e) => e.weight >= threshold && enabledTypes.has(e.type))
      .map((e) => ({
        source: e.sourceId,
        target: e.targetId,
        color: EDGE_COLORS[e.type],
        width: 0.5 + e.weight * 3,
      }));

    if (ghost) {
      nodes.push({
        id: ghost.node.id,
        name: ghost.node.name + " (candidate)",
        color: "#ffffff",
        val: 2 + ghost.node.weightedDegree * 1.5,
        isCommander: false,
        ghost: true,
        ref: ghost.node,
      });
      for (const l of ghost.links) {
        links.push({ source: l.source, target: l.target, color: "#ffffff", width: 1.5, ghost: true });
      }
    }

    return { nodes, links };
  }, [graph, threshold, enabledTypes, ghost]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ForceGraph2D
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="#0f1117"
        cooldownTicks={120}
        linkColor={(l: object) => (l as FGLink).color}
        linkWidth={(l: object) => (l as FGLink).width}
        linkLineDash={(l: object) => ((l as FGLink).ghost ? [4, 4] : null)}
        onNodeClick={(n: object) => onSelect((n as FGNode).ref)}
        nodeCanvasObject={(node: object, ctx: CanvasRenderingContext2D, scale: number) => {
          const n = node as FGNode & { x: number; y: number };
          const r = Math.max(2, Math.sqrt(n.val) * 1.6);
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = n.color;
          ctx.fill();
          if (n.isCommander || n.ghost) {
            ctx.lineWidth = 1.5 / scale;
            ctx.strokeStyle = n.ghost ? "#ffffff" : "#d9a441";
            ctx.stroke();
          }
          if (scale > 1.4 || n.isCommander || r > 5) {
            const label = n.name;
            ctx.font = `${10 / scale}px system-ui`;
            ctx.fillStyle = "#e6e8ee";
            ctx.textAlign = "center";
            ctx.fillText(label, n.x, n.y + r + 9 / scale);
          }
        }}
        nodePointerAreaPaint={(node: object, color: string, ctx: CanvasRenderingContext2D) => {
          const n = node as FGNode & { x: number; y: number };
          const r = Math.max(3, Math.sqrt(n.val) * 1.6);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 2, 0, 2 * Math.PI);
          ctx.fill();
        }}
      />
    </div>
  );
}
