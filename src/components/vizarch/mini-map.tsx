"use client";

import { useMemo } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { buildSvg } from "@/lib/vizarch/svg-builder";
import { getGraphBounds } from "@/lib/vizarch/layout-engine";

// Mini-map: small thumbnail of the full diagram in the bottom-right corner of the canvas.
// Shows a viewport rectangle indicating the current zoom/pan position.
// Click anywhere on the mini-map to navigate there.

const MINI_W = 160;
const MINI_H = 100;

export function MiniMap() {
  const graph = useDiagramStore((s) => s.graph);
  const svg = useDiagramStore((s) => s.svg);
  const svgWidth = useDiagramStore((s) => s.svgWidth);
  const svgHeight = useDiagramStore((s) => s.svgHeight);
  const zoom = useDiagramStore((s) => s.zoom);
  const panX = useDiagramStore((s) => s.panX);
  const panY = useDiagramStore((s) => s.panY);
  const wrapW = useDiagramStore((s) => s.wrapW);
  const wrapH = useDiagramStore((s) => s.wrapH);
  const setPan = useDiagramStore((s) => s.setPan);

  // Render a simplified mini SVG (no edge labels, no node labels — just shapes)
  const miniSvg = useMemo(() => {
    if (!graph) return "";
    // Build a minimal SVG with just nodes as colored dots
    const bounds = getGraphBounds(graph);
    if (!isFinite(bounds.minX)) return "";
    const pad = 20;
    const w = (bounds.maxX - bounds.minX) + 160 + pad * 2; // 160 = NODE_W
    const h = (bounds.maxY - bounds.minY) + 88 + pad * 2;   // 88 = NODE_H
    const offsetX = -bounds.minX + pad;
    const offsetY = -bounds.minY + pad;
    const dots = graph.nodes
      .filter((n) => !n.hidden)
      .map((n) => {
        const cx = (n.x + 80) + offsetX; // 80 = NODE_W/2
        const cy = (n.y + 44) + offsetY; // 44 = NODE_H/2
        const color = n.customColor ?? TYPE_COLOR[n.type] ?? "#3b82f6";
        return `<rect x="${n.x + offsetX}" y="${n.y + offsetY}" width="20" height="12" rx="2" fill="${color}" opacity="0.8" />`;
      });
    const lines = graph.edges
      .filter((e) => !e.hidden)
      .map((e) => {
        const a = graph.nodes.find((n) => n.id === e.from);
        const b = graph.nodes.find((n) => n.id === e.to);
        if (!a || !b) return "";
        const x1 = (a.x + 80) + offsetX;
        const y1 = (a.y + 44) + offsetY;
        const x2 = (b.x + 80) + offsetX;
        const y2 = (b.y + 44) + offsetY;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="0.5" opacity="0.5" />`;
      });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet">${lines.join("")}${dots.join("")}</svg>`;
  }, [graph]);

  // Compute the scale of the mini-map relative to the full SVG
  const miniScale = useMemo(() => {
    if (!svgWidth || !svgHeight) return 0;
    return Math.min(MINI_W / svgWidth, MINI_H / svgHeight);
  }, [svgWidth, svgHeight]);

  // Compute the viewport rectangle (what portion of the full SVG is currently visible)
  // Uses REAL wrap dimensions from the store (set by canvas ResizeObserver)
  const viewportRect = useMemo(() => {
    if (!miniScale || !svgWidth || !svgHeight || !wrapW || !wrapH) return null;
    // The visible area in SVG coordinates is: (wrapW / zoom) x (wrapH / zoom)
    const visibleW = wrapW / zoom;
    const visibleH = wrapH / zoom;
    // The SVG is centered in the wrap, then translated by panX/panY (in screen px), then scaled by zoom
    const svgCenterX = svgWidth / 2;
    const svgCenterY = svgHeight / 2;
    const viewX = svgCenterX - visibleW / 2 - panX / zoom;
    const viewY = svgCenterY - visibleH / 2 - panY / zoom;
    return {
      x: viewX * miniScale,
      y: viewY * miniScale,
      w: visibleW * miniScale,
      h: visibleH * miniScale,
    };
  }, [miniScale, svgWidth, svgHeight, zoom, panX, panY, wrapW, wrapH]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!miniScale || !svgWidth || !svgHeight || !wrapW || !wrapH) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // The mini-map content is centered in the div
    const renderedW = svgWidth * miniScale;
    const renderedH = svgHeight * miniScale;
    const offsetX = (rect.width - renderedW) / 2;
    const offsetY = (rect.height - renderedH) / 2;
    const clickX = e.clientX - rect.left - offsetX;
    const clickY = e.clientY - rect.top - offsetY;
    // Convert to SVG coordinates
    const svgX = clickX / miniScale;
    const svgY = clickY / miniScale;
    // We want this point to be the center of the visible area
    const visibleW = wrapW / zoom;
    const visibleH = wrapH / zoom;
    const newPanX = (svgWidth / 2 - visibleW / 2 - svgX) * zoom;
    const newPanY = (svgHeight / 2 - visibleH / 2 - svgY) * zoom;
    setPan(newPanX, newPanY);
  }

  if (!miniSvg || !miniScale) return null;

  return (
    <div
      className="absolute bottom-2 right-2 z-10 rounded-lg border border-border bg-background/90 backdrop-blur shadow-sm overflow-hidden"
      style={{ width: MINI_W, height: MINI_H }}
    >
      <div
        className="relative w-full h-full cursor-pointer"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: miniSvg }}
        style={{ opacity: 0.85 }}
      />
      {viewportRect && (
        <div
          className="absolute pointer-events-none border-2 border-teal-500 bg-teal-500/10 rounded-sm"
          style={{
            left: Math.max(0, viewportRect.x),
            top: Math.max(0, viewportRect.y),
            width: Math.min(MINI_W, viewportRect.w),
            height: Math.min(MINI_H, viewportRect.h),
          }}
        />
      )}
      <div className="absolute top-1 left-1 text-[8px] text-muted-foreground font-medium uppercase tracking-wider pointer-events-none">
        Mini-map
      </div>
    </div>
  );
}

const TYPE_COLOR: Record<string, string> = {
  compute: "#3b82f6",
  container: "#06b6d4",
  database: "#f97316",
  cache: "#22c55e",
  storage: "#f59e0b",
  cdn: "#a855f7",
  messaging: "#ec4899",
  queue: "#10b981",
  networking: "#6366f1",
  analytics: "#8b5cf6",
  monitoring: "#0ea5e9",
  security: "#ef4444",
  ai: "#d946ef",
  frontend: "#14b8a6",
  external: "#64748b",
  client: "#475569",
};
