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

export function buildSvg(
  graph: ArchGraph,
  opts: SvgRenderOptions = {},
): { svg: string; width: number; height: number } {
  const theme = opts.theme ?? "light";
  const pad = opts.pad ?? 40;
  const showLabels = opts.showNodeLabels ?? true;
  const showEdgeLabels = opts.showEdgeLabels ?? true;
  const iconSize = ICON_SIZES[opts.iconSize ?? "md"];

  const bounds = getGraphBounds(graph);
  const minX = Math.min(bounds.minX, bounds.maxX) - pad;
  const minY = Math.min(bounds.minY, bounds.maxY) - pad;
  const maxX = Math.max(bounds.minX, bounds.maxX) + NODE_W + pad;
  const maxY = Math.max(bounds.minY, bounds.maxY) + NODE_H + pad;
  const width = Math.max(640, maxX - minX);
  const height = Math.max(360, maxY - minY);

  const bg = theme === "dark" ? "#0b1220" : "#ffffff";
  const fg = theme === "dark" ? "#e2e8f0" : "#0f172a";
  const subFg = theme === "dark" ? "#94a3b8" : "#64748b";
  const cardBg = theme === "dark" ? "#0f172a" : "#ffffff";
  const cardStroke = theme === "dark" ? "#1e293b" : "#e2e8f0";

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
      PROTOCOL_COLORS[proto] ?? (theme === "dark" ? "#64748b" : "#94a3b8");
    edgePaths.push(
      `<path d="M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${dashArray}" />`,
    );
    // Arrowhead
    const angle = Math.atan2(y2 - c2y, x2 - c2x);
    const arrowSize = 8;
    const ax = x2 - arrowSize * Math.cos(angle - Math.PI / 7);
    const ay = y2 - arrowSize * Math.sin(angle - Math.PI / 7);
    const bx = x2 - arrowSize * Math.cos(angle + Math.PI / 7);
    const by = y2 - arrowSize * Math.sin(angle + Math.PI / 7);
    edgePaths.push(
      `<path d="M${x2},${y2} L${ax},${ay} L${bx},${by} Z" fill="${color}" />`,
    );
    if (showEdgeLabels && e.label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      edgeLabels.push(
        `<g><rect x="${midX - 28}" y="${midY - 9}" width="56" height="18" rx="9" fill="${bg}" stroke="${cardStroke}" /><text x="${midX}" y="${midY + 4}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" fill="${subFg}" text-anchor="middle">${escapeXml(e.label)}</text></g>`,
      );
    }
  }

  const nodeGroups: string[] = [];
  for (const n of graph.nodes) {
    if (n.hidden) continue;
    const color = nodeColor(n, graph.style);
    const isDark = theme === "dark";
    // Card background with subtle accent stripe
    nodeGroups.push(
      `<g class="node" data-id="${escapeXml(n.id)}" data-service="${escapeXml(n.serviceId)}" transform="translate(${n.x},${n.y})">
  <rect width="${NODE_W}" height="${NODE_H}" rx="12" ry="12" fill="${cardBg}" stroke="${cardStroke}" stroke-width="1.5" />
  <rect width="6" height="${NODE_H}" rx="3" ry="3" fill="${color}" />
  <g transform="translate(${NODE_W / 2 - iconSize / 2}, 14)">
    <rect width="${iconSize}" height="${iconSize}" rx="${iconSize / 4}" fill="${color}22" />
    <path d="${n.iconPath}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="scale(${iconSize / 24})" />
  </g>
  ${showLabels ? `<text x="${NODE_W / 2}" y="${NODE_H - 22}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="600" fill="${fg}" text-anchor="middle">${escapeXml(n.label)}</text>` : ""}
  <text x="${NODE_W / 2}" y="${NODE_H - 8}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="9" fill="${subFg}" text-anchor="middle">${escapeXml(n.provider)}/${escapeXml(n.type)}</text>
</g>`,
    );
    void isDark;
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
  return { svg, width, height };
}
