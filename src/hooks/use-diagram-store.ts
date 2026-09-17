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
  diagramTitle: string;          // user-editable title (saved with share link)

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
  // Node connection mode: when set, clicking another node creates an edge from this one
  connectModeFromId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  // Real canvas wrap dimensions (for accurate mini-map viewport)
  wrapW: number;
  wrapH: number;
  showCustomization: boolean;
  showExport: boolean;
  showServicesCatalog: boolean;
  showShortcutsHelp: boolean;
  showRecentPanel: boolean;
  showSidebar: boolean;   // mobile: toggle sidebar visibility

  // Status
  status: GenerationStatus;
  error: string | null;

  // Share
  shareUrl: string | null;
  shareSlug: string | null;
  viewingShared: boolean;   // true when loaded via ?share= slug

  // History (undo/redo)
  history: HistoryEntry[];
  historyIdx: number;            // pointer into history; -1 means no entries

  // Actions
  setDescription: (d: string) => void;
  setTemplate: (id: string | null) => void;
  setDiagramTitle: (t: string) => void;
  setStyle: (patch: Partial<ArchStyle>) => void;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setConnectMode: (fromId: string | null) => void;
  setZoom: (z: number) => void;
  setPan: (x: number, y: number) => void;
  setWrapSize: (w: number, h: number) => void;
  resetView: () => void;
  fitToScreen: () => void;
  toggleCustomization: () => void;
  toggleExport: () => void;
  toggleServicesCatalog: () => void;
  toggleShortcutsHelp: () => void;
  toggleRecentPanel: () => void;
  toggleSidebar: () => void;
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
  addEdge: (fromId: string, toId: string, protocol?: string, label?: string) => string | null;

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
  setViewingShared: (v: boolean) => void;
  forkShared: () => void;   // fork: clear share slug so edits become a new diagram

  // localStorage persistence
  loadFromStorage: () => void;
}

function renderClient(graph: ArchGraph, style: ArchStyle, view?: {
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  hoveredNodeId?: string | null;
  connectModeFromId?: string | null;
}) {
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
    selectedNodeId: view?.selectedNodeId ?? null,
    selectedEdgeId: view?.selectedEdgeId ?? null,
    hoveredNodeId: view?.hoveredNodeId ?? null,
    connectModeFromId: view?.connectModeFromId ?? null,
  });
  return { svg, width, height };
}

// Helper: compute a fresh meta object from the current graph (used after mutations)
function computeMeta(graph: ArchGraph, base?: DiagramMeta): DiagramMeta {
  return {
    nodeCount: graph.nodes.filter((n) => !n.hidden).length,
    edgeCount: graph.edges.filter((e) => !e.hidden).length,
    parseTimeMs: base?.parseTimeMs ?? 0,
    layoutTimeMs: base?.layoutTimeMs ?? 0,
    exportTimeMs: base?.exportTimeMs ?? 0,
    cacheHit: base?.cacheHit ?? false,
    confidence: base?.confidence,
    ambiguities: base?.ambiguities,
    usedFallback: base?.usedFallback,
  };
}

// Helper: render a graph with the current view state (selection, hover, connect mode)
function renderWithView(graph: ArchGraph, style: ArchStyle, state: DiagramState) {
  return renderClient(graph, style, {
    selectedNodeId: state.selectedNodeId,
    selectedEdgeId: state.selectedEdgeId,
    hoveredNodeId: state.hoveredNodeId,
    connectModeFromId: state.connectModeFromId,
  });
}

const STORAGE_KEY = "vizarch:autosave:v2";

interface PersistShape {
  description: string;
  diagramTitle?: string;
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
      diagramTitle: state.diagramTitle,
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
  diagramTitle: "Untitled architecture",
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
  connectModeFromId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  wrapW: 0,
  wrapH: 0,
  showCustomization: true,
  showExport: false,
  showServicesCatalog: false,
  showShortcutsHelp: false,
  showRecentPanel: false,
  showSidebar: true,
  status: "idle",
  error: null,
  shareUrl: null,
  shareSlug: null,
  viewingShared: false,
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
  setDiagramTitle: (t) => {
    set({ diagramTitle: t || "Untitled architecture" });
    scheduleSave(get());
  },

  setStyle: (patch) => {
    const next = { ...get().style, ...patch };
    set({ style: next });
    const graph = get().graph;
    if (graph) {
      const g = { ...graph, style: next };
      const { svg, width, height } = renderWithView(g, next, get());
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

  setSelectedNode: (id) => {
    const state = get();
    // If in connect mode and user clicks a different node, create an edge
    if (state.connectModeFromId && id && state.connectModeFromId !== id) {
      state.addEdge(state.connectModeFromId, id, "direct");
      set({ connectModeFromId: null });
      get().rerender();
      return;
    }
    // If in connect mode and clicks the same node, cancel
    if (state.connectModeFromId && id === state.connectModeFromId) {
      set({ connectModeFromId: null });
      get().rerender();
      return;
    }
    set({ selectedNodeId: id, selectedEdgeId: null });
    get().rerender();
  },
  setSelectedEdge: (id) => {
    set({ selectedEdgeId: id, selectedNodeId: null });
    get().rerender();
  },
  setHoveredNode: (id) => {
    if (get().hoveredNodeId === id) return; // no-op if unchanged
    set({ hoveredNodeId: id });
    get().rerender();
  },
  setConnectMode: (fromId) => {
    set({ connectModeFromId: fromId, selectedEdgeId: null });
    get().rerender();
  },
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(5, z)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setWrapSize: (w, h) => set({ wrapW: w, wrapH: h }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  fitToScreen: () => set({ zoom: 1, panX: 0, panY: 0 }), // canvas component handles actual fit via ResizeObserver autoFit
  toggleCustomization: () => set({ showCustomization: !get().showCustomization }),
  toggleExport: () => set({ showExport: !get().showExport }),
  toggleServicesCatalog: () => set({ showServicesCatalog: !get().showServicesCatalog }),
  toggleShortcutsHelp: () => set({ showShortcutsHelp: !get().showShortcutsHelp }),
  toggleRecentPanel: () => set({ showRecentPanel: !get().showRecentPanel }),
  toggleSidebar: () => set({ showSidebar: !get().showSidebar }),
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
    const { svg, width, height } = renderWithView(target.graph, get().style, get());
    set({
      graph: target.graph,
      description: target.description,
      selectedNodeId: target.selectedNodeId,
      svg,
      svgWidth: width,
      svgHeight: height,
      historyIdx: historyIdx - 1,
      meta: computeMeta(target.graph, get().meta ?? undefined),
    });
    scheduleSave(get());
  },

  redo: () => {
    const { history, historyIdx } = get();
    if (historyIdx >= history.length - 1) return;
    const target = history[historyIdx + 1];
    if (!target) return;
    const { svg, width, height } = renderWithView(target.graph, get().style, get());
    set({
      graph: target.graph,
      description: target.description,
      selectedNodeId: target.selectedNodeId,
      svg,
      svgWidth: width,
      svgHeight: height,
      historyIdx: historyIdx + 1,
      meta: computeMeta(target.graph, get().meta ?? undefined),
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
    const { svg, width, height } = renderWithView(next, get().style, get());
    set({ graph: next, svg, svgWidth: width, svgHeight: height, meta: computeMeta(next, get().meta ?? undefined) });
    get().pushHistory();
    scheduleSave(get());
  },

  deleteNode: (id) => {
    const graph = get().graph;
    if (!graph) return;
    const nodes = graph.nodes.filter((n) => n.id !== id);
    const edges = graph.edges.filter((e) => e.from !== id && e.to !== id);
    const next = { ...graph, nodes, edges };
    const { svg, width, height } = renderWithView(next, get().style, get());
    set({
      graph: next,
      svg,
      svgWidth: width,
      svgHeight: height,
      selectedNodeId: null,
      meta: computeMeta(next, get().meta ?? undefined),
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
    const { svg, width, height } = renderWithView(next, get().style, get());
    set({ graph: next, svg, svgWidth: width, svgHeight: height, meta: computeMeta(next, get().meta ?? undefined) });
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
    const { svg, width, height } = renderWithView(next, get().style, get());
    set({
      graph: next,
      svg,
      svgWidth: width,
      svgHeight: height,
      selectedNodeId: newId,
      meta: computeMeta(next, get().meta ?? undefined),
    });
    get().pushHistory();
    scheduleSave(get());
    return newId;
  },

  addEdge: (fromId, toId, protocol = "direct", label) => {
    const graph = get().graph;
    if (!graph) return null;
    // Prevent duplicate edges between the same pair (same direction)
    if (graph.edges.some((e) => e.from === fromId && e.to === toId)) return null;
    const newId = `e${Date.now().toString(36)}`;
    const newEdge: ArchEdge = {
      id: newId,
      from: fromId,
      to: toId,
      protocol,
      label,
      style: "solid",
    };
    const next = { ...graph, edges: [...graph.edges, newEdge] };
    const { svg, width, height } = renderWithView(next, get().style, get());
    set({
      graph: next,
      svg,
      svgWidth: width,
      svgHeight: height,
      selectedEdgeId: newId,
      meta: computeMeta(next, get().meta ?? undefined),
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
    const { svg, width, height } = renderWithView(next, get().style, get());
    set({ graph: next, svg, svgWidth: width, svgHeight: height, meta: computeMeta(next, get().meta ?? undefined) });
    get().pushHistory();
    scheduleSave(get());
  },

  deleteEdge: (id) => {
    const graph = get().graph;
    if (!graph) return;
    const edges = graph.edges.filter((e) => e.id !== id);
    const next = { ...graph, edges };
    const { svg, width, height } = renderWithView(next, get().style, get());
    set({
      graph: next,
      svg,
      svgWidth: width,
      svgHeight: height,
      selectedEdgeId: null,
      meta: computeMeta(next, get().meta ?? undefined),
    });
    get().pushHistory();
    scheduleSave(get());
  },

  rerender: () => {
    const graph = get().graph;
    if (!graph) return;
    const { svg, width, height } = renderWithView(graph, get().style, get());
    set({ svg, svgWidth: width, svgHeight: height });
  },

  setShare: (slug, url) => set({ shareSlug: slug, shareUrl: url }),
  setViewingShared: (v) => set({ viewingShared: v }),
  forkShared: () => {
    // Clear the share slug so this is now a new diagram (user can save a new share link)
    set({
      shareSlug: null,
      shareUrl: null,
      viewingShared: false,
    });
    // Clear URL param without full reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("share");
      window.history.replaceState({}, "", url.toString());
    }
  },

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
      const { svg, width, height } = renderWithView(g, get().style, get());
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
    if (typeof persisted.diagramTitle === "string") {
      set({ diagramTitle: persisted.diagramTitle });
    }
  },
}));
