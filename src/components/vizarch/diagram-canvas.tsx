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
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });

  // Observe wrap size so auto-fit runs after layout settles.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      const w = e.contentRect.width;
      const h = e.contentRect.height;
      setWrapSize({ w, h });
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

  // Click on SVG nodes via event delegation
  const onSvgClick = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const g = target.closest("g.node") as SVGGraphicsElement | null;
    if (g) {
      const id = g.getAttribute("data-id");
      if (id) {
        setSelectedNode(selectedNodeId === id ? null : id);
        return;
      }
    }
    setSelectedNode(null);
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const g = target.closest("g.node") as SVGGraphicsElement | null;
    const id = g?.getAttribute("data-id") ?? null;
    setHoveredNode(id);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "Escape") setSelectedNode(null);
      else if (e.key === "+" || e.key === "=") {
        setZoom(zoom * 1.15);
        setAutoFit(false);
      } else if (e.key === "-" || e.key === "_") {
        setZoom(zoom * 0.85);
        setAutoFit(false);
      } else if (e.key === "0") {
        resetView();
        setAutoFit(true);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (selectedNodeId) useDiagramStore.getState().duplicateNode(selectedNodeId);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedNodeId) {
          useDiagramStore.getState().deleteNode(selectedNodeId);
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
    <div className="relative h-full min-h-[460px] lg:min-h-[560px] rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border border-border bg-background/90 backdrop-blur px-1 py-1 shadow-sm">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setZoom(zoom * 1.2); setAutoFit(false); }} title="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setZoom(zoom * 0.8); setAutoFit(false); }} title="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { resetView(); setAutoFit(true); }} title="Reset view">
          <Maximize className="h-3.5 w-3.5" />
        </Button>
        <div className="px-1.5 text-[11px] text-muted-foreground tabular-nums">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Layer indicator */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-lg border border-border bg-background/90 backdrop-blur px-2 py-1 shadow-sm">
        <Layers className="h-3.5 w-3.5 text-teal-600" />
        <span className="text-[11px] text-muted-foreground">
          {useDiagramStore.getState().graph?.nodes.length ?? 0} nodes ·{" "}
          {useDiagramStore.getState().graph?.edges.length ?? 0} edges
        </span>
      </div>

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
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <div className="text-sm">Generating diagram via Claude…</div>
            <div className="text-[11px]">This may take 2-4 seconds on first call</div>
          </div>
        )}
        {isEmpty && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Layers className="h-6 w-6 opacity-50" />
            <div className="text-sm">No diagram yet</div>
            <div className="text-[11px]">Describe your architecture above and hit Generate</div>
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
    </div>
  );
}

function toast_deleted() {
  // Lazy import to keep canvas bundle lean
  import("sonner").then((m) => m.toast.success("Node deleted"));
}
