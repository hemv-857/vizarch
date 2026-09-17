// vizarch — Zustand store for client-side diagram editor state.

"use client";

import { create } from "zustand";
import type { ArchEdge, ArchGraph, ArchNode, ArchStyle } from "@/lib/vizarch/types";
import { DEFAULT_STYLE } from "@/lib/vizarch/types";
import { layoutGraph } from "@/lib/vizarch/layout-engine";
import { buildSvg } from "@/lib/vizarch/svg-builder";

export type GenerationStatus = "idle" | "loading" | "success" | "error";

export interface DiagramMeta {
  nodeCount: number;
  edgeCount: number;
  parseTimeMs: number;
  layoutTimeMs: number;
  exportTimeMs: number;
  cacheHit: boolean;
  confidence?: number;
  ambiguities?: string[];
  usedFallback?: boolean;
}

interface DiagramState {
  // Source input
  description: string;
  templateId: string | null;

  // Generated diagram
  graph: ArchGraph | null;
  svg: string;
  svgWidth: number;
  svgHeight: number;
  meta: DiagramMeta | null;

  // Style & view
  style: ArchStyle;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  showCustomization: boolean;
  showExport: boolean;
  showServicesCatalog: boolean;

  // Status
  status: GenerationStatus;
  error: string | null;

  // Share
  shareUrl: string | null;
  shareSlug: string | null;

  // Actions
  setDescription: (d: string) => void;
  setTemplate: (id: string | null) => void;
  setStyle: (patch: Partial<ArchStyle>) => void;
  setSelectedNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setZoom: (z: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  toggleCustomization: () => void;
  toggleExport: () => void;
  toggleServicesCatalog: () => void;
  setStatus: (s: GenerationStatus) => void;
  setError: (e: string | null) => void;
  setGraph: (g: ArchGraph) => void;
  applyGraph: (g: ArchGraph, svg: string, w: number, h: number, meta: DiagramMeta) => void;

  // Node editing (client-side)
  updateNode: (id: string, patch: Partial<ArchNode>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  setNodeColor: (id: string, color: string | null) => void;

  // Re-render SVG from current graph/style (client-side)
  rerender: () => void;

  // Share
  setShare: (slug: string | null, url: string | null) => void;
}

function renderClient(graph: ArchGraph, style: ArchStyle) {
  const layoutOpts = {
    orientation:
      style.layout === "vertical" || style.layout === "hierarchical"
        ? ("vertical" as const)
        : ("horizontal" as const),
    layerAssignment: style.layerAssignment,
  };
  const { width, height } = layoutGraph(graph, layoutOpts);
  const { svg } = buildSvg(graph, {
    theme: style.theme,
    showEdgeLabels: style.showEdgeLabels,
    showNodeLabels: style.showLabels,
    iconSize: style.iconSize,
  });
  return { svg, width, height };
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  description: "",
  templateId: null,
  graph: null,
  svg: "",
  svgWidth: 0,
  svgHeight: 0,
  meta: null,
  style: { ...DEFAULT_STYLE },
  selectedNodeId: null,
  hoveredNodeId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  showCustomization: true,
  showExport: false,
  showServicesCatalog: false,
  status: "idle",
  error: null,
  shareUrl: null,
  shareSlug: null,

  setDescription: (d) => set({ description: d, templateId: null }),
  setTemplate: (id) =>
    set({
      templateId: id,
      description: id ? "" : get().description,
    }),

  setStyle: (patch) => {
    const next = { ...get().style, ...patch };
    set({ style: next });
    // Re-render client-side if graph exists
    const graph = get().graph;
    if (graph) {
      const g = { ...graph, style: next };
      const { svg, width, height } = renderClient(g, next);
      set({ graph: g, svg, svgWidth: width, svgHeight: height });
    }
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(5, z)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  toggleCustomization: () => set({ showCustomization: !get().showCustomization }),
  toggleExport: () => set({ showExport: !get().showExport }),
  toggleServicesCatalog: () =>
    set({ showServicesCatalog: !get().showServicesCatalog }),
  setStatus: (s) => set({ status: s }),
  setError: (e) => set({ error: e, status: e ? "error" : "idle" }),
  setGraph: (g) => set({ graph: g }),
  applyGraph: (g, svg, w, h, meta) =>
    set({
      graph: g,
      svg,
      svgWidth: w,
      svgHeight: h,
      meta,
      status: "success",
      error: null,
      selectedNodeId: null,
      hoveredNodeId: null,
    }),

  updateNode: (id, patch) => {
    const graph = get().graph;
    if (!graph) return;
    const nodes = graph.nodes.map((n) =>
      n.id === id ? { ...n, ...patch } : n,
    );
    const next = { ...graph, nodes };
    const { svg, width, height } = renderClient(next, get().style);
    set({ graph: next, svg, svgWidth: width, svgHeight: height });
  },

  deleteNode: (id) => {
    const graph = get().graph;
    if (!graph) return;
    const nodes = graph.nodes.filter((n) => n.id !== id);
    const edges = graph.edges.filter((e) => e.from !== id && e.to !== id);
    const next = { ...graph, nodes, edges };
    const { svg, width, height } = renderClient(next, get().style);
    set({
      graph: next,
      svg,
      svgWidth: width,
      svgHeight: height,
      selectedNodeId: null,
    });
  },

  duplicateNode: (id) => {
    const graph = get().graph;
    if (!graph) return;
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) return;
    const newId = `n${Date.now().toString(36)}`;
    const newNode: ArchNode = {
      ...node,
      id: newId,
      x: node.x + 30,
      y: node.y + 30,
      label: `${node.label} (copy)`,
    };
    const next = { ...graph, nodes: [...graph.nodes, newNode] };
    const { svg, width, height } = renderClient(next, get().style);
    set({ graph: next, svg, svgWidth: width, svgHeight: height });
  },

  setNodeColor: (id, color) => {
    const graph = get().graph;
    if (!graph) return;
    const nodes = graph.nodes.map((n) =>
      n.id === id ? { ...n, customColor: color ?? undefined } : n,
    );
    const next = { ...graph, nodes };
    const { svg, width, height } = renderClient(next, get().style);
    set({ graph: next, svg, svgWidth: width, svgHeight: height });
  },

  rerender: () => {
    const graph = get().graph;
    if (!graph) return;
    const { svg, width, height } = renderClient(graph, get().style);
    set({ svg, svgWidth: width, svgHeight: height });
  },

  setShare: (slug, url) => set({ shareSlug: slug, shareUrl: url }),
}));
