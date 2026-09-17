"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Loader2,
  Layers,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniMap } from "@/components/vizarch/mini-map";
import { NodeSearchBar } from "@/components/vizarch/node-search-bar";

export function DiagramCanvas() {
  const svg = useDiagramStore((s) => s.svg);
  const width = useDiagramStore((s) => s.svgWidth);
  const height = useDiagramStore((s) => s.svgHeight);
  const status = useDiagramStore((s) => s.status);
  const error = useDiagramStore((s) => s.error);
  const zoom = useDiagramStore((s) => s.zoom);
  const panX = useDiagramStore((s) => s.panX);
  const panY = useDiagramStore((s) => s.panY);
  const setZoom = useDiagramStore((s) => s.setZoom);
  const setPan = useDiagramStore((s) => s.setPan);
  const resetView = useDiagramStore((s) => s.resetView);
  const setSelectedNode = useDiagramStore((s) => s.setSelectedNode);
  const setHoveredNode = useDiagramStore((s) => s.setHoveredNode);
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const hoveredNodeId = useDiagramStore((s) => s.hoveredNodeId);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [autoFit, setAutoFit] = useState(true);
  const [wrapSize, setWrapSizeLocal] = useState({ w: 0, h: 0 });

  // Observe wrap size so auto-fit runs after layout settles.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const storeSetWrapSize = useDiagramStore.getState().setWrapSize;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      const w = e.contentRect.width;
      const h = e.contentRect.height;
      setWrapSizeLocal({ w, h });
      storeSetWrapSize(w, h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-fit the SVG into the wrap when size changes or diagram changes
  useEffect(() => {
    if (!width || !height) return;
    if (!autoFit) return;
    const wrapW = wrapSize.w - 24;
    const wrapH = wrapSize.h - 24;
    if (!wrapW || !wrapH) return;
    const scale = Math.min(wrapW / width, wrapH / height, 1.4);
    const next = Math.max(0.1, Math.min(5, scale));
    if (Math.abs(next - zoom) > 0.02) {
      setZoom(next);
      setPan(0, 0);
    }
  }, [width, height, autoFit, wrapSize, zoom, setZoom, setPan]);

  // Wheel zoom
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 10) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(zoom * factor);
      setAutoFit(false);
    },
    [zoom, setZoom],
  );

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setAutoFit(false);
    setDragStart({ x: e.clientX, y: e.clientY, panX, panY });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPan(dragStart.panX + dx, dragStart.panY + dy);
  };

  useEffect(() => {
    const onUp = () => setDragging(false);
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  // Click on SVG nodes / edges via event delegation
  const onSvgClick = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const nodeG = target.closest("g.node") as SVGGraphicsElement | null;
    if (nodeG) {
      const id = nodeG.getAttribute("data-id");
      if (id) {
        setSelectedNode(selectedNodeId === id ? null : id);
        return;
      }
    }
    const edgeG = target.closest("g.edge") as SVGGraphicsElement | null;
    if (edgeG) {
      const id = edgeG.getAttribute("data-id");
      if (id) {
        const store = useDiagramStore.getState();
        store.setSelectedEdge(store.selectedEdgeId === id ? null : id);
        return;
      }
    }
    setSelectedNode(null);
    useDiagramStore.getState().setSelectedEdge(null);
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const g = target.closest("g.node") as SVGGraphicsElement | null;
    const id = g?.getAttribute("data-id") ?? null;
    setHoveredNode(id);
  };

  // Keyboard shortcuts (canvas-scoped; undo/redo handled in page.tsx)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "Escape") {
        setSelectedNode(null);
        useDiagramStore.getState().setSelectedEdge(null);
        useDiagramStore.getState().setConnectMode(null);
      } else if (e.key === "+" || e.key === "=") {
        setZoom(zoom * 1.15);
        setAutoFit(false);
      } else if (e.key === "-" || e.key === "_") {
        setZoom(zoom * 0.85);
        setAutoFit(false);
      } else if (e.key === "0" || e.key === "f" || e.key === "F") {
        resetView();
        setAutoFit(true);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (selectedNodeId) useDiagramStore.getState().duplicateNode(selectedNodeId);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        const store = useDiagramStore.getState();
        if (selectedNodeId) {
          store.deleteNode(selectedNodeId);
          toast_deleted();
        } else if (store.selectedEdgeId) {
          store.deleteEdge(store.selectedEdgeId);
          toast_deleted();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, selectedNodeId, setZoom, setSelectedNode, resetView]);

  const isEmpty = !svg && status !== "loading";
  const isLoading = status === "loading" && !svg;

  return (
    <div className="relative h-full min-h-[320px] rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border border-border bg-background/90 backdrop-blur px-1 py-1 shadow-sm">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setZoom(zoom * 1.2); setAutoFit(false); }} title="Zoom in (+)">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setZoom(zoom * 0.8); setAutoFit(false); }} title="Zoom out (−)">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => { resetView(); setAutoFit(true); }} title="Fit to screen (0)">
          <Maximize className="h-3.5 w-3.5 mr-1" />Fit
        </Button>
        <div className="px-1.5 text-[11px] text-muted-foreground tabular-nums border-l border-border ml-0.5">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Layer indicator (top-left) */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-lg border border-border bg-background/90 backdrop-blur px-2 py-1 shadow-sm">
        <Layers className="h-3.5 w-3.5 text-teal-600" />
        <span className="text-[11px] text-muted-foreground">
          {useDiagramStore.getState().meta?.nodeCount ?? 0} nodes ·{" "}
          {useDiagramStore.getState().meta?.edgeCount ?? 0} edges
        </span>
      </div>

      {/* Connect-mode banner */}
      {useDiagramStore.getState().connectModeFromId && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/40 backdrop-blur px-3 py-1.5 shadow-sm text-[11px] text-amber-700 dark:text-amber-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>
            <strong>Connect mode:</strong> click a target node to create an edge
          </span>
          <button
            className="ml-1 underline hover:no-underline text-amber-800 dark:text-amber-200"
            onClick={() => useDiagramStore.getState().setConnectMode(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="absolute inset-2 z-10 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold mb-0.5">Generation error</div>
            <div className="opacity-90">{error}</div>
          </div>
        </div>
      )}

      <div
        ref={wrapRef}
        className={cn(
          "absolute inset-0 select-none overflow-hidden",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onWheel={onWheel}
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            {/* Shimmer skeleton */}
            <div className="absolute inset-4 rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/50 to-transparent animate-pulse" style={{ animationDuration: "1.5s" }} />
              {/* Fake nodes skeleton */}
              <div className="absolute top-1/4 left-1/4 w-32 h-20 rounded-lg border border-border bg-muted/30" />
              <div className="absolute top-1/2 left-1/2 w-32 h-20 rounded-lg border border-border bg-muted/30" />
              <div className="absolute top-3/4 left-3/4 w-32 h-20 rounded-lg border border-border bg-muted/30" />
            </div>
            <div className="relative z-10 flex flex-col items-center gap-2 bg-background/80 backdrop-blur px-6 py-4 rounded-lg border border-border shadow-md">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              <div className="text-sm font-medium text-foreground">Generating diagram via Claude…</div>
              <div className="text-[11px]">This may take 2-7 seconds on first call</div>
            </div>
          </div>
        )}
        {isEmpty && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-teal-500/10 animate-pulse" />
              <Layers className="h-8 w-8 text-teal-600/70" />
            </div>
            <div className="text-sm font-medium text-foreground/80">No diagram yet</div>
            <div className="text-[11px] max-w-xs text-center">
              Describe your architecture above and hit <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">⌘/Ctrl</kbd>+<kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Enter</kbd>, or pick a preset template.
            </div>
          </div>
        )}
        {svg && (
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onSvgClick}
              onMouseMove={onSvgMouseMove}
              className="rounded-lg shadow-md"
              style={{ background: "transparent" }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        )}
      </div>

      {/* Hovered node badge */}
      {hoveredNodeId && hoveredNodeId !== selectedNodeId && (
        <div className="absolute bottom-2 left-2 z-10 rounded-lg border border-border bg-background/90 backdrop-blur px-2 py-1 shadow-sm">
          <Badge variant="outline" className="text-[10px]">
            {hoveredNodeId}
          </Badge>
          <span className="text-[11px] text-muted-foreground ml-2">click to select</span>
        </div>
      )}

      {/* Mini-map (bottom-right corner) */}
      {svg && <MiniMap />}

      {/* Node search bar (top-center, only when diagram loaded) */}
      {svg && !isLoading && <NodeSearchBar />}
    </div>
  );
}

function toast_deleted() {
  // Lazy import to keep canvas bundle lean
  import("sonner").then((m) => m.toast.success("Node deleted"));
}
