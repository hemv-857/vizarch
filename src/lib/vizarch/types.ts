// vizarch — Core graph types shared across parser, layout engine, exporters, frontend.

import type { ServiceMeta, ServiceType, ServiceProvider } from "./services";

export interface ArchNode {
  id: string;
  label: string;
  serviceId: string;       // canonical service id (ServiceMeta.id)
  serviceName: string;     // display name (ServiceMeta.name)
  provider: ServiceProvider;
  type: ServiceType;
  iconPath: string;
  brandColor?: string;
  description: string;
  docLink?: string;
  // Layout-computed (filled by layout engine)
  x: number;
  y: number;
  layer?: number;
  // User overrides
  customColor?: string;
  hidden?: boolean;
}

export interface ArchEdge {
  id: string;
  from: string;            // node id
  to: string;              // node id
  protocol?: string;       // e.g. "https", "postgres", "event"
  label?: string;
  style?: "solid" | "dashed" | "dotted";
  hidden?: boolean;
}

export interface ArchGraph {
  nodes: ArchNode[];
  edges: ArchEdge[];
  // Style configuration carried alongside graph
  style?: ArchStyle;
}

export interface ArchStyle {
  colorMode: "type" | "brand" | "custom";
  layout: "auto" | "horizontal" | "vertical" | "hierarchical";
  iconSize: "sm" | "md" | "lg";
  showLabels: boolean;
  showEdgeLabels: boolean;
  edgeStyle: "solid" | "dashed" | "dotted";
  theme: "light" | "dark";
  // Optional manual node color overrides { [nodeId]: "#hex" }
  nodeColors?: Record<string, string>;
  // Optional manual layer assignment { [nodeId]: number }
  layerAssignment?: Record<string, number>;
}

export const DEFAULT_STYLE: ArchStyle = {
  colorMode: "type",
  layout: "auto",
  iconSize: "md",
  showLabels: true,
  showEdgeLabels: true,
  edgeStyle: "solid",
  theme: "dark",
};

export interface DiagramResult {
  graph: ArchGraph;
  svg: string;
  width: number;
  height: number;
  meta: {
    nodeCount: number;
    edgeCount: number;
    parseTimeMs: number;
    layoutTimeMs: number;
    exportTimeMs: number;
    cacheHit: boolean;
    confidence?: number;
    ambiguities?: string[];
  };
}

// Convert a list of service metas + parsed edges into a bare ArchGraph (no layout)
export function buildGraphFromServices(
  services: { id: string; service: ServiceMeta; label?: string }[],
  edges: { from: string; to: string; protocol?: string; label?: string }[],
): ArchGraph {
  const nodes: ArchNode[] = services.map((s) => ({
    id: s.id,
    label: s.label ?? s.service.name,
    serviceId: s.service.id,
    serviceName: s.service.name,
    provider: s.service.provider,
    type: s.service.type,
    iconPath: s.service.iconPath,
    brandColor: s.service.brandColor,
    description: s.service.description,
    docLink: s.service.docLink,
    x: 0,
    y: 0,
  }));
  const archEdges: ArchEdge[] = edges.map((e, i) => ({
    id: `e${i}`,
    from: e.from,
    to: e.to,
    protocol: e.protocol ?? "direct",
    label: e.label,
    style: "solid",
  }));
  return { nodes, edges: archEdges, style: { ...DEFAULT_STYLE } };
}
