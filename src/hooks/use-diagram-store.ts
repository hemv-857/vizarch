// vizarch — Zustand store for client-side diagram editor state.
// v2 additions:
//   - Undo/redo history stack (Cmd+Z / Cmd+Y)
//   - Selected edge + updateEdge action
//   - Manual node insertion (addNode)
//   - localStorage persistence (auto-save)
//   - Top-level darkMode flag (drives <html> class via effect)
//   - Recent diagrams panel visibility

"use client";

import { create } from "zustand";
import type { ArchEdge, ArchGraph, ArchNode, ArchStyle } from "@/lib/vizarch/types";
import { DEFAULT_STYLE } from "@/lib/vizarch/types";
import { layoutGraph } from "@/lib/vizarch/layout-engine";
import { buildSvg } from "@/lib/vizarch/svg-builder";
import type { ServiceMeta } from "@/lib/vizarch/services";

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

const HISTORY_LIMIT = 50;

interface HistoryEntry {
  graph: ArchGraph;
  description: string;
  selectedNodeId: string | null;
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
  darkMode: boolean;             // top-level dark mode (separate from style.theme for header toggle)
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  showCustomization: boolean;
  showExport: boolean;
  showServicesCatalog: boolean;
  showShortcutsHelp: boolean;
  showRecentPanel: boolean;

  // Status
  status: GenerationStatus;
  error: string | null;

  // Share
  shareUrl: string | null;
  shareSlug: string | null;

  // History (undo/redo)
  history: HistoryEntry[];
  historyIdx: number;            // pointer into history; -1 means no entries

  // Actions
  setDescription: (d: string) => void;
  setTemplate: (id: string | null) => void;
  setStyle: (patch: Partial<ArchStyle>) => void;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setZoom: (z: number) => void;
  setPan: (x: number, y) => void;
  resetView: () => void;
  toggleCustomization: () => void;
  toggleExport: () => void;
  toggleServicesCatalog: () => void;
  toggleShortcutsHelp: () => void;
  toggleRecentPanel: () => void;
  setStatus: (s: GenerationStatus) => void;
  setError: (e: string | null) => void;
  setGraph: (g: ArchGraph) => void;
  applyGraph: (g: ArchGraph, svg: string, w: number, h: number, meta: DiagramMeta) => void;

  // Node editing (with history)
  updateNode: (id: string, patch: Partial<ArchNode>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  setNodeColor: (id: string, color: string | null) => void;
  addNode: (service: ServiceMeta, label?: string) => string | null;

  // Edge editing
  updateEdge: (id: string, patch: Partial<ArchEdge>) => void;
  deleteEdge: (id: string) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Re-render SVG from current graph/style (client-side)
  rerender: () => void;

  // Share
  setShare: (slug: string | null, url: string | null) => void;

  // localStorage persistence
  loadFromStorage: () => void;
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

const STORAGE_KEY = "vizarch:autosave:v2";

interface PersistShape {
  description: string;
  graph: ArchGraph | null;
  style: ArchStyle;
  darkMode: boolean;
}

function loadPersisted(): Partial<PersistShape> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistShape>;
  } catch {
    return null;
  }
}

function saveToStorage(state: DiagramState) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistShape = {
      description: state.description,
      graph: state.graph,
      style: state.style,
      darkMode: state.darkMode,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

// Debounced persistence
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(state: DiagramState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToStorage(state), 600);
}

// Apply dark mode class to <html>
function applyDarkModeClass(dark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (dark) root.classList.add("dark");
  else root.classList.remove("dark");
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
  darkMode: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  hoveredNodeId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  showCustomization: true,
  showExport: false,
  showServicesCatalog: false,
  showShortcutsHelp: false,
  showRecentPanel: false,
  status: "idle",
  error: null,
  shareUrl: null,
  shareSlug: null,
  history: [],
  historyIdx: -1,

  setDescription: (d) => {
    set({ description: d, templateId: null });
    scheduleSave(get());
  },
  setTemplate: (id) => {
    set({ templateId: id, description: id ? "" : get().description });
    scheduleSave(get());
  },

  setStyle: (patch) => {
    const next = { ...get().style, ...patch };
    set({ style: next });
    const graph = get().graph;
    if (graph) {
      const g = { ...graph, style: next };
      const { svg, width, height } = renderClient(g, next);
      set({ graph: g, svg, svgWidth: width, svgHeight: height });
    }
    scheduleSave(get());
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    // Also sync style.theme so SVG renderer uses dark
    get().setStyle({ theme: next ? "dark" : "light" });
    applyDarkModeClass(next);
    scheduleSave(get());
  },
  setDarkMode: (v) => {
    set({ darkMode: v });
    get().setStyle({ theme: v ? "dark" : "light" });
    applyDarkModeClass(v);
    scheduleSave(get());
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(5, z)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  toggleCustomization: () => set({ showCustomization: !get().showCustomization }),
  toggleExport: () => set({ showExport: !get().showExport }),
  toggleServicesCatalog: () => set({ showServicesCatalog: !get().showServicesCatalog }),
  toggleShortcutsHelp: () => set({ showShortcutsHelp: !get().showShortcutsHelp }),
  toggleRecentPanel: () => set({ showRecentPanel: !get().showRecentPanel }),
  setStatus: (s) => set({ status: s }),
  setError: (e) => set({ error: e, status: e ? "error" : "idle" }),
  setGraph: (g) => {
    set({ graph: g });
    scheduleSave(get());
  },
  applyGraph: (g, svg, w, h, meta) => {
    set({
      graph: g,
      svg,
      svgWidth: w,
      svgHeight: h,
      meta,
      status: "success",
      error: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      hoveredNodeId: null,
      // Reset history when a new graph is applied (so undo doesn't cross diagrams)
      history: [],
      historyIdx: -1,
    });
    // Push initial state to history (so undo can return to it)
    get().pushHistory();
    scheduleSave(get());
  },

  pushHistory: () => {
    const { graph, description, selectedNodeId, history, historyIdx } = get();
    if (!graph) return;
    const entry: HistoryEntry = {
      graph: JSON.parse(JSON.stringify(graph)),
      description,
      selectedNodeId,
    };
    // Truncate any "redo" tail
    const next = history.slice(0, historyIdx + 1);
    next.push(entry);
    // Cap history size
    while (next.length > HISTORY_LIMIT) next.shift();
    set({ history: next, historyIdx: next.length - 1 });
  },

  undo: () => {
    const { history, historyIdx } = get();
    if (historyIdx <= 0) return;
    const target = history[historyIdx - 1];
    if (!target) return;
    const { svg, width, height } = renderClient(target.graph, get().style);
    set({
      graph: target.graph,
      description: target.description,
      selectedNodeId: target.selectedNodeId,
      svg,
      svgWidth: width,
      svgHeight: height,
      historyIdx: historyIdx - 1,
    });
    scheduleSave(get());
  },

  redo: () => {
    const { history, historyIdx } = get();
    if (historyIdx >= history.length - 1) return;
    const target = history[historyIdx + 1];
    if (!target) return;
    const { svg, width, height } = renderClient(target.graph, get().style);
    set({
      graph: target.graph,
      description: target.description,
      selectedNodeId: target.selectedNodeId,
      svg,
      svgWidth: width,
      svgHeight: height,
      historyIdx: historyIdx + 1,
    });
    scheduleSave(get());
  },

  canUndo: () => get().historyIdx > 0,
  canRedo: () => get().historyIdx < get().history.length - 1,

  updateNode: (id, patch) => {
    const graph = get().graph;
    if (!graph) return;
    const nodes = graph.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    const next = { ...graph, nodes };
    const { svg, width, height } = renderClient(next, get().style);
    set({ graph: next, svg, svgWidth: width, svgHeight: height });
    get().pushHistory();
    scheduleSave(get());
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
    get().pushHistory();
    scheduleSave(get());
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
    get().pushHistory();
    scheduleSave(get());
  },

  setNodeColor: (id, color) => {
    get().updateNode(id, { customColor: color ?? undefined });
  },

  addNode: (service, label) => {
    const graph = get().graph;
    if (!graph) return null;
    const newId = `n${Date.now().toString(36)}`;
    const newNode: ArchNode = {
      id: newId,
      label: label ?? service.name,
      serviceId: service.id,
      serviceName: service.name,
      provider: service.provider,
      type: service.type,
      iconPath: service.iconPath,
      brandColor: service.brandColor,
      description: service.description,
      docLink: service.docLink,
      x: 200,
      y: 200,
    };
    const next = { ...graph, nodes: [...graph.nodes, newNode] };
    const { svg, width, height } = renderClient(next, get().style);
    set({
      graph: next,
      svg,
      svgWidth: width,
      svgHeight: height,
      selectedNodeId: newId,
    });
    get().pushHistory();
    scheduleSave(get());
    return newId;
  },

  updateEdge: (id, patch) => {
    const graph = get().graph;
    if (!graph) return;
    const edges = graph.edges.map((e) => (e.id === id ? { ...e, ...patch } : e));
    const next = { ...graph, edges };
    const { svg, width, height } = renderClient(next, get().style);
    set({ graph: next, svg, svgWidth: width, svgHeight: height });
    get().pushHistory();
    scheduleSave(get());
  },

  deleteEdge: (id) => {
    const graph = get().graph;
    if (!graph) return;
    const edges = graph.edges.filter((e) => e.id !== id);
    const next = { ...graph, edges };
    const { svg, width, height } = renderClient(next, get().style);
    set({
      graph: next,
      svg,
      svgWidth: width,
      svgHeight: height,
      selectedEdgeId: null,
    });
    get().pushHistory();
    scheduleSave(get());
  },

  rerender: () => {
    const graph = get().graph;
    if (!graph) return;
    const { svg, width, height } = renderClient(graph, get().style);
    set({ svg, svgWidth: width, svgHeight: height });
  },

  setShare: (slug, url) => set({ shareSlug: slug, shareUrl: url }),

  loadFromStorage: () => {
    const persisted = loadPersisted();
    if (!persisted) return;
    if (persisted.style) {
      const next = { ...DEFAULT_STYLE, ...persisted.style };
      set({ style: next });
    }
    if (typeof persisted.darkMode === "boolean") {
      set({ darkMode: persisted.darkMode });
      applyDarkModeClass(persisted.darkMode);
    }
    if (persisted.graph) {
      const g = persisted.graph;
      const { svg, width, height } = renderClient(g, get().style);
      set({
        graph: g,
        svg,
        svgWidth: width,
        svgHeight: height,
        meta: {
          nodeCount: g.nodes.length,
          edgeCount: g.edges.length,
          parseTimeMs: 0,
          layoutTimeMs: 0,
          exportTimeMs: 0,
          cacheHit: false,
          confidence: 1,
          ambiguities: [],
        },
        status: "success",
        history: [],
        historyIdx: -1,
      });
      get().pushHistory();
    }
    if (typeof persisted.description === "string") {
      set({ description: persisted.description });
    }
  },
}));
