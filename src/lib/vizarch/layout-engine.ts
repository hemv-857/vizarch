// vizarch — Layout engine
// Implements a compact Sugiyama-style hierarchical layout in three passes:
//   1. Cycle-safe layer assignment (longest path from sources)
//   2. Node ordering within layer to minimize edge crossings (barycenter heuristic)
//   3. Coordinate assignment
// Performance target: <100ms for 100-node diagrams.

import type { ArchGraph, ArchNode } from "./types";

export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  layerGap: number;     // vertical gap between layers
  nodeGap: number;     // horizontal gap between nodes in same layer
  orientation: "horizontal" | "vertical"; // horizontal = LR, vertical = TB
  layerAssignment?: Record<string, number>;
  layoutMode?: "sugiyama" | "flowchart"; // sugiyama = hierarchical, flowchart = force-directed
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 160,
  nodeHeight: 88,
  layerGap: 96,
  nodeGap: 40,
  orientation: "horizontal",
  layoutMode: "sugiyama",
};

interface LayoutInternal {
  layers: string[][];        // layer index -> list of node ids
  nodeIdToLayer: Map<string, number>;
}

// --- Pass 1: layer assignment (longest path) ---------------------------

function assignLayers(graph: ArchGraph, opts: LayoutOptions): LayoutInternal {
  const nodes = graph.nodes.filter((n) => !n.hidden);
  const ids = new Set(nodes.map((n) => n.id));

  // Adjacency: out from each node, in to each node
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  for (const n of nodes) {
    outEdges.set(n.id, []);
    inEdges.set(n.id, []);
  }
  for (const e of graph.edges) {
    if (e.hidden) continue;
    if (!ids.has(e.from) || !ids.has(e.to)) continue;
    outEdges.get(e.from)!.push(e.to);
    inEdges.get(e.to)!.push(e.from);
  }

  // Manual layer assignment overrides first
  const nodeLayer = new Map<string, number>();
  if (opts.layerAssignment) {
    for (const [id, layer] of Object.entries(opts.layerAssignment)) {
      if (ids.has(id)) nodeLayer.set(id, Math.max(0, layer));
    }
  }

  // Compute longest path from sources for any unset node
  // Sources = nodes with no incoming edges
  const sources = nodes.filter((n) => (inEdges.get(n.id)?.length ?? 0) === 0);

  // If no sources found (cycle), pick nodes with most out-edges as roots
  const roots = sources.length > 0
    ? sources
    : nodes
        .slice()
        .sort((a, b) => (outEdges.get(b.id)!.length - outEdges.get(a.id)!.length))
        .slice(0, Math.max(1, Math.ceil(nodes.length / 8)));

  for (const r of roots) {
    if (!nodeLayer.has(r.id)) nodeLayer.set(r.id, 0);
  }

  // BFS-style longest path propagation
  // Iterate until stable (max = nodes.length iterations)
  let changed = true;
  let safety = nodes.length + 2;
  while (changed && safety-- > 0) {
    changed = false;
    for (const n of nodes) {
      const outs = outEdges.get(n.id)!;
      for (const o of outs) {
        const cur = nodeLayer.get(o);
        const proposed = (nodeLayer.get(n.id) ?? 0) + 1;
        if (cur === undefined || cur < proposed) {
          nodeLayer.set(o, proposed);
          changed = true;
        }
      }
    }
  }

  // Any nodes still unset (disconnected or in cycles) → layer 0
  for (const n of nodes) {
    if (!nodeLayer.has(n.id)) nodeLayer.set(n.id, 0);
  }

  // Build layer lists
  const maxLayer = Math.max(...Array.from(nodeLayer.values()));
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const n of nodes) {
    layers[nodeLayer.get(n.id)!].push(n.id);
  }
  // Deduplicate layers
  for (let i = 0; i < layers.length; i++) {
    layers[i] = Array.from(new Set(layers[i]));
  }

  return { layers, nodeIdToLayer: nodeLayer };
}

// --- Pass 2: ordering within layer to reduce crossings (barycenter) ---

function orderLayers(graph: ArchGraph, internal: LayoutInternal): void {
  const { layers, nodeIdToLayer } = internal;
  if (layers.length <= 1) return;

  // Build incoming/outgoing for crossing counting
  const idxInLayer = new Map<string, number>();
  for (let l = 0; l < layers.length; l++) {
    layers[l].forEach((id, i) => idxInLayer.set(id, i));
  }

  // Multiple sweeps for stable result
  for (let iter = 0; iter < 24; iter++) {
    // Down-sweep: order layer L using barycenter from L-1
    for (let l = 1; l < layers.length; l++) {
      const bary = new Map<string, number>();
      for (const id of layers[l]) {
        // barycenter = avg of positions of predecessors in L-1
        const preds = graph.edges
          .filter((e) => e.to === id && nodeIdToLayer.get(e.from) === l - 1)
          .map((e) => idxInLayer.get(e.from) ?? 0);
        const b = preds.length
          ? preds.reduce((a, b) => a + b, 0) / preds.length
          : idxInLayer.get(id) ?? 0;
        bary.set(id, b);
      }
      layers[l].sort((a, b) => (bary.get(a)! - bary.get(b)!));
      layers[l].forEach((id, i) => idxInLayer.set(id, i));
    }
    // Up-sweep: order layer L using barycenter from L+1
    for (let l = layers.length - 2; l >= 0; l--) {
      const bary = new Map<string, number>();
      for (const id of layers[l]) {
        const succs = graph.edges
          .filter((e) => e.from === id && nodeIdToLayer.get(e.to) === l + 1)
          .map((e) => idxInLayer.get(e.to) ?? 0);
        const b = succs.length
          ? succs.reduce((a, b) => a + b, 0) / succs.length
          : idxInLayer.get(id) ?? 0;
        bary.set(id, b);
      }
      layers[l].sort((a, b) => (bary.get(a)! - bary.get(b)!));
      layers[l].forEach((id, i) => idxInLayer.set(id, i));
    }
  }
}

// --- Pass 3: coordinate assignment ---------------------------

function assignCoordinates(
  graph: ArchGraph,
  internal: LayoutInternal,
  opts: LayoutOptions,
): { width: number; height: number } {
  const { layers, nodeIdToLayer } = internal;
  const nodeMap = new Map<string, ArchNode>(graph.nodes.map((n) => [n.id, n]));

  // Track max layer width to center smaller layers
  const layerWidths = layers.map((layer) => {
    if (layer.length === 0) return 0;
    return layer.length * opts.nodeWidth + (layer.length - 1) * opts.nodeGap;
  });
  const maxLayerWidth = Math.max(1, ...layerWidths);

  // Center each layer horizontally
  for (let l = 0; l < layers.length; l++) {
    const w = layerWidths[l];
    const startX = Math.max(0, (maxLayerWidth - w) / 2);
    layers[l].forEach((id, i) => {
      const node = nodeMap.get(id);
      if (!node) return;
      const isVert = opts.orientation === "vertical";
      if (isVert) {
        // Vertical layout: layers stack top-to-bottom (y), nodes spread horizontally (x)
        node.x = startX + i * (opts.nodeWidth + opts.nodeGap);
        node.y = l * (opts.nodeHeight + opts.layerGap);
      } else {
        // Horizontal (LR): layers go left-to-right (x), nodes stack vertically (y)
        node.x = l * (opts.nodeWidth + opts.layerGap);
        node.y = startX + i * (opts.nodeHeight + opts.nodeGap);
      }
      node.layer = l;
    });
  }

  const isVert = opts.orientation === "vertical";
  const totalWidth = isVert
    ? maxLayerWidth + opts.nodeWidth
    : layers.length * opts.nodeWidth + (layers.length - 1) * opts.layerGap + opts.nodeWidth;
  const totalHeight = isVert
    ? layers.length * opts.nodeHeight + (layers.length - 1) * opts.layerGap + opts.nodeHeight
    : Math.max(...layers.map((l) => l.length)) * (opts.nodeHeight + opts.nodeGap) + opts.nodeHeight;

  return {
    width: Math.max(totalWidth, maxLayerWidth + opts.nodeWidth),
    height: Math.max(totalHeight, opts.nodeHeight * 2),
  };
}

export function layoutGraph(
  graph: ArchGraph,
  optsIn?: Partial<LayoutOptions>,
): { width: number; height: number } {
  const opts: LayoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...optsIn };
  if (opts.layoutMode === "flowchart") {
    return layoutFlowchart(graph, opts);
  }
  const internal = assignLayers(graph, opts);
  orderLayers(graph, internal);
  return assignCoordinates(graph, internal, opts);
}

// Compute bounding box of laid-out graph (after layoutGraph called)
export function getGraphBounds(graph: ArchGraph): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (graph.nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of graph.nodes) {
    if (n.hidden) continue;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

// Flowchart layout: force-directed organic layout for natural flow diagrams
export function layoutFlowchart(
  graph: ArchGraph,
  opts: LayoutOptions,
): { width: number; height: number } {
  const nodes = graph.nodes.filter((n) => !n.hidden);
  const nodeMap = new Map<string, ArchNode>(nodes.map((n) => [n.id, n]));

  if (nodes.length === 0) return { width: 100, height: 100 };

  // Build adjacency
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of graph.edges) {
    if (e.hidden) continue;
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from); // undirected for force layout
  }

  // Initialize positions in a compact circle
  const centerX = 0;
  const centerY = 0;
  const radius = Math.max(nodes.length * 15, 120); // tighter initial radius
  for (let i = 0; i < nodes.length; i++) {
    const angle = (i / nodes.length) * 2 * Math.PI;
    const n = nodes[i];
    n.x = centerX + radius * Math.cos(angle);
    n.y = centerY + radius * Math.sin(angle);
    n.layer = 0;
  }

  // Force-directed layout (simple Fruchterman-Reingold style)
  const iterations = 60;
  const k = radius * 0.5; // smaller optimal distance
  const temp = radius * 0.5;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => forces.set(n.id, { x: 0, y: 0 }));

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const force = Math.min((k * k) / dist, 500); // cap repulsion force
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        const fa = forces.get(a.id)!;
        const fb = forces.get(b.id)!;
        fa.x += fx; fa.y += fy;
        fb.x -= fx; fb.y -= fy;
      }
    }

    // Attraction along edges
    for (const e of graph.edges) {
      if (e.hidden) continue;
      const a = nodeMap.get(e.from);
      const b = nodeMap.get(e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const force = Math.min((dist * dist) / k, 500); // cap attraction force
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;
      const fa = forces.get(a.id)!;
      const fb = forces.get(b.id)!;
      fa.x -= fx; fa.y -= fy;
      fb.x += fx; fb.y += fy;
    }

    // Apply forces with temperature cooling
    const t = temp * (1 - iter / iterations);
    for (const n of nodes) {
      const f = forces.get(n.id)!;
      const fx = Math.max(-t, Math.min(t, f.x));
      const fy = Math.max(-t, Math.min(t, f.y));
      n.x += fx * damping;
      n.y += fy * damping;
    }
  }

  // Center and normalize
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const pad = 60;

  for (const n of nodes) {
    n.x = n.x - minX + pad;
    n.y = n.y - minY + pad;
  }

  return { width: width + 2 * pad, height: height + 2 * pad };
}
