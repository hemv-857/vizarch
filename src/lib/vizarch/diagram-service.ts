// vizarch — Diagram generation service.
// Top-level orchestrator: parse description → build graph → layout → render SVG.

import type { ArchStyle, DiagramResult } from "./types";
import { parseArchitecture } from "./parser";
import { layoutGraph } from "./layout-engine";
import { buildSvg } from "./svg-builder";
import { getCached, setCached, makeCacheKey } from "./cache";
import { buildGraphFromServices, DEFAULT_STYLE } from "./types";
import { TEMPLATES, getTemplateById, type ArchTemplate } from "./templates";
import { resolveServiceByName } from "./services";

export interface GenerateRequest {
  description?: string;
  templateId?: string;
  style?: Partial<ArchStyle>;
  useCache?: boolean;
}

function templateToGraph(t: ArchTemplate) {
  const services = t.nodes.map((n) => {
    const meta = resolveServiceByName(n.service);
    if (!meta) return null;
    return { id: n.id, service: meta, label: n.label };
  }).filter(Boolean) as { id: string; service: NonNullable<ReturnType<typeof resolveServiceByName>>; label?: string }[];
  return buildGraphFromServices(services, t.edges);
}

export async function generateDiagram(req: GenerateRequest): Promise<DiagramResult> {
  const style: ArchStyle = { ...DEFAULT_STYLE, ...req.style };
  const styleJson = JSON.stringify(style);

  // Resolve source: template or description
  const descKey = req.templateId ? `tpl:${req.templateId}` : `desc:${req.description ?? ""}`;
  const cacheKey = makeCacheKey(descKey, styleJson);

  if (req.useCache !== false) {
    const cached = getCached(cacheKey);
    if (cached) {
      return { ...cached, meta: { ...cached.meta, cacheHit: true } };
    }
  }

  const t0 = Date.now();
  let graph;
  let confidence = 1;
  let ambiguities: string[] = [];
  let usedFallback = false;

  if (req.templateId) {
    const tpl = getTemplateById(req.templateId);
    if (!tpl) {
      throw new Error(`Unknown template: ${req.templateId}`);
    }
    graph = templateToGraph(tpl);
  } else if (req.description) {
    const parsed = await parseArchitecture(req.description);
    graph = parsed.graph;
    confidence = parsed.confidence;
    ambiguities = parsed.ambiguities;
    usedFallback = parsed.usedFallback;
  } else {
    throw new Error("Either description or templateId must be provided");
  }
  const parseTimeMs = Date.now() - t0;

  // Apply style
  graph.style = style;
  if (style.layerAssignment) {
    // Custom layers handled inside layout engine
  }

  const layoutOpts = {
    orientation:
      style.layout === "vertical" || style.layout === "hierarchical"
        ? ("vertical" as const)
        : ("horizontal" as const),
    layerAssignment: style.layerAssignment,
  };

  const t1 = Date.now();
  const { width, height } = layoutGraph(graph, layoutOpts);
  const layoutTimeMs = Date.now() - t1;

  const t2 = Date.now();
  const { svg } = buildSvg(graph, {
    theme: style.theme,
    showEdgeLabels: style.showEdgeLabels,
    showNodeLabels: style.showLabels,
    iconSize: style.iconSize,
  });
  const exportTimeMs = Date.now() - t2;

  const result: DiagramResult = {
    graph,
    svg,
    width,
    height,
    meta: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      parseTimeMs,
      layoutTimeMs,
      exportTimeMs,
      cacheHit: false,
      confidence,
      ambiguities,
    },
  };

  if (req.useCache !== false) {
    setCached(cacheKey, result);
  }

  void usedFallback;
  return result;
}

export function listTemplates() {
  return TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    text: t.text,
    nodeCount: t.nodes.length,
    edgeCount: t.edges.length,
  }));
}
