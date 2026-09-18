// vizarch — SVG builder
// Renders an ArchGraph (already laid-out) into a standalone SVG string.
// Used both by the API export pipeline and the SSR-shared preview.

import type { ArchEdge, ArchGraph, ArchNode, ArchStyle } from "./types";
import { TYPE_COLORS, PROTOCOL_COLORS } from "./services";
import { getGraphBounds } from "./layout-engine";

export interface SvgRenderOptions {
  theme?: "light" | "dark";
  pad?: number;       // padding around content
  showEdgeLabels?: boolean;
  showNodeLabels?: boolean;
  iconSize?: "sm" | "md" | "lg";
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  hoveredNodeId?: string | null;
  connectModeFromId?: string | null;
}

const ICON_SIZES: Record<NonNullable<SvgRenderOptions["iconSize"]>, number> = {
  sm: 16,
  md: 28,
  lg: 40,
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Strip any HTML/script tags from user-provided text before SVG insertion
function sanitizeText(s: string): string {
  return s
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/javascript:/gi, "") // strip JS URIs
    .replace(/on\w+\s*=/gi, ""); // strip event handlers
}

function nodeColor(node: ArchNode, style?: ArchStyle): string {
  if (style?.colorMode === "brand" && node.brandColor) return node.brandColor;
  if (style?.colorMode === "custom" && style.nodeColors?.[node.id]) {
    return style.nodeColors[node.id];
  }
  if (node.customColor) return node.customColor;
  return TYPE_COLORS[node.type] ?? "#3b82f6";
}

const NODE_W = 160;
const NODE_H = 88;

// SVG memoization cache: hash graph+opts → cached SVG result
// Prevents re-rendering identical diagrams (e.g. during hover state changes
// when the graph itself hasn't changed). For large diagrams (100+ nodes),
// this can save 10-50ms per render.
const SVG_CACHE = new Map<string, { svg: string; width: number; height: number }>();
const SVG_CACHE_LIMIT = 100; // increased for large diagram support
let svgCacheHits = 0;
let svgCacheMisses = 0;

// Fast hash using djb2 algorithm for better performance on large graphs
function fastHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

function graphHash(graph: ArchGraph, opts: SvgRenderOptions): string {
  const nodeSig = graph.nodes
    .filter((n) => !n.hidden)
    .map((n) => `${n.id}:${Math.round(n.x)},${Math.round(n.y)}:${n.label}:${n.customColor ?? ""}`)
    .join("|");
  const edgeSig = graph.edges
    .filter((e) => !e.hidden)
    .map((e) => `${e.id}:${e.from}->${e.to}:${e.protocol}:${e.label}:${e.style}`)
    .join("|");
  const optsSig = [
    opts.theme ?? "light",
    opts.iconSize ?? "md",
    opts.showNodeLabels ? "1" : "0",
    opts.showEdgeLabels ? "1" : "0",
    opts.selectedNodeId ?? "",
    opts.selectedEdgeId ?? "",
    opts.hoveredNodeId ?? "",
    opts.connectModeFromId ?? "",
    graph.style?.colorMode ?? "type",
    graph.style?.edgeStyle ?? "solid",
  ].join(",");
  // Use fast hash for large graphs to avoid creating very long cache keys
  const fullSig = `${nodeSig}||${edgeSig}||${optsSig}`;
  if (fullSig.length > 500) {
    return fastHash(fullSig);
  }
  return fullSig;
}

export function buildSvg(
  graph: ArchGraph,
  opts: SvgRenderOptions = {},
): { svg: string; width: number; height: number } {
  // Check memoization cache
  const hash = graphHash(graph, opts);
  const cached = SVG_CACHE.get(hash);
  if (cached) { svgCacheHits++; return cached; }
  svgCacheMisses++;
  const theme = opts.theme ?? "light";
  const pad = opts.pad ?? 40;
  const showLabels = opts.showNodeLabels ?? true;
  const showEdgeLabels = opts.showEdgeLabels ?? true;
  const iconSize = ICON_SIZES[opts.iconSize ?? "md"];
  const selectedNodeId = opts.selectedNodeId ?? null;
  const selectedEdgeId = opts.selectedEdgeId ?? null;
  const hoveredNodeId = opts.hoveredNodeId ?? null;
  const connectModeFromId = opts.connectModeFromId ?? null;

  const bounds = getGraphBounds(graph);
  const minX = Math.min(bounds.minX, bounds.maxX) - pad;
  const minY = Math.min(bounds.minY, bounds.maxY) - pad;
  const maxX = Math.max(bounds.minX, bounds.maxX) + NODE_W + pad;
  const maxY = Math.max(bounds.minY, bounds.maxY) + NODE_H + pad;
  const width = Math.max(640, maxX - minX);
  const height = Math.max(360, maxY - minY);

  const bg = theme === "dark" ? "#0b1220" : "#ffffff";
  const fg = theme === "dark" ? "#e2e8f0" : "#0f172a";
  const subFg = theme === "dark" ? "#94a3b8" : "#475569";
  const cardBg = theme === "dark" ? "#0f172a" : "#ffffff";
  const cardStroke = theme === "dark" ? "#1e293b" : "#cbd5e1";
  const selectionRing = theme === "dark" ? "#14b8a6" : "#0d9488";

  const nodeMap = new Map<string, ArchNode>(graph.nodes.map((n) => [n.id, n]));

  // Build edges first so nodes overlay them
  const edgePaths: string[] = [];
  const edgeLabels: string[] = [];
  for (const e of graph.edges) {
    if (e.hidden) continue;
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b) continue;
    const x1 = a.x + NODE_W / 2;
    const y1 = a.y + NODE_H / 2;
    const x2 = b.x + NODE_W / 2;
    const y2 = b.y + NODE_H / 2;
    // Cubic-bezier curve
    const dx = x2 - x1;
    const dy = y2 - y1;
    const c1x = x1 + dx * 0.5;
    const c1y = y1;
    const c2x = x2 - dx * 0.5;
    const c2y = y2;
    const dashArray =
      e.style === "dashed"
        ? "6 4"
        : e.style === "dotted"
          ? "2 4"
          : (graph.style?.edgeStyle === "dashed"
              ? "6 4"
              : graph.style?.edgeStyle === "dotted"
                ? "2 4"
                : "");
    const proto = (e.protocol ?? "direct").toLowerCase();
    const color =
      PROTOCOL_COLORS[proto] ?? (theme === "dark" ? "#94a3b8" : "#64748b");
    const isSelected = e.id === selectedEdgeId;
    const strokeW = isSelected ? 4 : 2;
    // Wrap each edge in a <g class="edge" data-id="..."> so canvas can detect clicks.
    // We render an invisible thick "hit" path on top for easier clicking.
    edgePaths.push(
      `<g class="edge${isSelected ? " selected" : ""}" data-id="${escapeXml(e.id)}" data-protocol="${escapeXml(proto)}" style="cursor:pointer">` +
      (isSelected ? `<path d="M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}" fill="none" stroke="${selectionRing}" stroke-width="${strokeW + 6}" stroke-linecap="round" stroke-opacity="0.25" pointer-events="none" />` : "") +
      `<path d="M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-dasharray="${dashArray}" />` +
      `<path d="M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}" fill="none" stroke="transparent" stroke-width="14" stroke-linecap="round" pointer-events="stroke" />` +
      `</g>`,
    );
    // Arrowhead
    const angle = Math.atan2(y2 - c2y, x2 - c2x);
    const arrowSize = isSelected ? 10 : 8;
    const ax = x2 - arrowSize * Math.cos(angle - Math.PI / 7);
    const ay = y2 - arrowSize * Math.sin(angle - Math.PI / 7);
    const bx = x2 - arrowSize * Math.cos(angle + Math.PI / 7);
    const by = y2 - arrowSize * Math.sin(angle + Math.PI / 7);
    edgePaths.push(
      `<path d="M${x2},${y2} L${ax},${ay} L${bx},${by} Z" fill="${color}" pointer-events="none" />`,
    );
    if (showEdgeLabels && e.label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      // Wider label rect for longer text, with slight padding
      const labelW = Math.max(60, e.label.length * 6.5 + 16);
      const labelH = 18;
      edgeLabels.push(
        `<g pointer-events="none"><rect x="${midX - labelW / 2}" y="${midY - labelH / 2}" width="${labelW}" height="${labelH}" rx="${labelH / 2}" fill="${bg}" stroke="${color}" stroke-width="1" stroke-opacity="0.5" /><text x="${midX}" y="${midY + 4}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${color}" text-anchor="middle" font-weight="600">${escapeXml(sanitizeText(e.label))}</text></g>`,
      );
    }
  }

  const nodeGroups: string[] = [];
  for (const n of graph.nodes) {
    if (n.hidden) continue;
    const color = nodeColor(n, graph.style);
    const isSelected = n.id === selectedNodeId;
    const isHovered = n.id === hoveredNodeId && !isSelected;
    const isConnectSource = n.id === connectModeFromId;
    const ringColor = isConnectSource ? "#f59e0b" : selectionRing;
    const showRing = isSelected || isHovered || isConnectSource;
    const nodeContent = (showRing ? `<rect x="-4" y="-4" width="${NODE_W + 8}" height="${NODE_H + 8}" rx="14" ry="14" fill="none" stroke="${ringColor}" stroke-width="2" stroke-opacity="${isSelected || isConnectSource ? 0.9 : 0.5}" />` : "") +
      `<rect width="${NODE_W}" height="${NODE_H}" rx="12" ry="12" fill="${cardBg}" stroke="${isSelected || isConnectSource ? ringColor : cardStroke}" stroke-width="${isSelected || isConnectSource ? 2 : 1.5}" />
  <rect width="6" height="${NODE_H}" rx="3" ry="3" fill="${color}" />
  <g transform="translate(${NODE_W / 2 - iconSize / 2}, 14)">
    <rect width="${iconSize}" height="${iconSize}" rx="${iconSize / 4}" fill="${color}22" />
    <path d="${n.iconPath}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" transform="scale(${iconSize / 24})" />
  </g>
  ${showLabels ? `<text x="${NODE_W / 2}" y="${NODE_H - 22}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600" fill="${fg}" text-anchor="middle">${escapeXml(sanitizeText(n.label))}</text>` : ""}
  <text x="${NODE_W / 2}" y="${NODE_H - 8}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" fill="${subFg}" text-anchor="middle" font-weight="500">${escapeXml(n.provider)}/${escapeXml(n.type)}</text>`;
    
    const nodeGroup = `<g class="node${isSelected ? " selected" : ""}${isHovered ? " hovered" : ""}${isConnectSource ? " connect-source" : ""}" data-id="${escapeXml(n.id)}" data-service="${escapeXml(n.serviceId)}" transform="translate(${n.x},${n.y})" style="cursor:pointer">${nodeContent}</g>`;
    
    if (n.docLink) {
      nodeGroups.push(`<a href="${escapeXml(n.docLink)}" target="_blank" rel="noopener noreferrer">${nodeGroup}</a>`);
    } else {
      nodeGroups.push(nodeGroup);
    }
  }

  const defs = `<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40,0 L0,0 0,40" fill="none" stroke="${theme === "dark" ? "#1e293b" : "#f1f5f9"}" stroke-width="0.5" />
  </pattern>
  <linearGradient id="bg-gradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${theme === "dark" ? "#0b1220" : "#ffffff"}" />
    <stop offset="1" stop-color="${theme === "dark" ? "#0a0f1f" : "#f8fafc"}" />
  </linearGradient>
</defs>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}" font-family="ui-sans-serif, system-ui, sans-serif">
  ${defs}
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#bg-gradient)" />
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#grid)" />
  <g class="edges">${edgePaths.join("\n  ")}${edgeLabels.length ? "\n  " + edgeLabels.join("\n  ") : ""}</g>
  <g class="nodes">${nodeGroups.join("\n  ")}</g>
</svg>`;
  const result = { svg, width, height };
  // Cache for future identical renders
  if (SVG_CACHE.size >= SVG_CACHE_LIMIT) {
    // Evict oldest entry (FIFO)
    const firstKey = SVG_CACHE.keys().next().value;
    if (firstKey) SVG_CACHE.delete(firstKey);
  }
  SVG_CACHE.set(hash, result);
  return result;
}

// Clear the SVG cache (useful for testing or memory management)
export function clearSvgCache(): void {
  SVG_CACHE.clear();
}

// Get cache statistics (for debugging / monitoring)
export function getSvgCacheStats(): { size: number; hits: number; misses: number; hitRate: string } {
  const total = svgCacheHits + svgCacheMisses;
  return {
    size: SVG_CACHE.size,
    hits: svgCacheHits,
    misses: svgCacheMisses,
    hitRate: total > 0 ? `${Math.round((svgCacheHits / total) * 100)}%` : "0%",
  };
}
