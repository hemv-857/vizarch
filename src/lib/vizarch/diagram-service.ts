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
  sourceMap?: Record<string, string>;
}

function templateToGraph(t: ArchTemplate) {
  const services = t.nodes.map((n) => {
    const meta = resolveServiceByName(n.service);
    if (!meta) return null;
    return { id: n.id, service: meta, label: n.label };
  }).filter(Boolean) as { id: string; service: NonNullable<ReturnType<typeof resolveServiceByName>>; label?: string }[];
  return buildGraphFromServices(services, t.edges);
}

export async function generateDiagram(req: GenerateRequest, sourceMap?: Record<string, string>): Promise<DiagramResult> {
  const style: ArchStyle = { ...DEFAULT_STYLE, ...req.style };
  const styleJson = JSON.stringify(style);
  const sourceMapKey = sourceMap ? JSON.stringify(sourceMap) : "";

  // Resolve source: template or description
  const descKey = req.templateId ? `tpl:${req.templateId}` : `desc:${req.description ?? ""}`;
  const cacheKey = makeCacheKey(descKey + sourceMapKey, styleJson);

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

  // Apply sourceMap to nodes (GitHub directory -> URL)
  if (sourceMap) {
    graph = applySourceMap(graph, sourceMap);
  }

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

function applySourceMap(graph: ReturnType<typeof buildGraphFromServices>, sourceMap: Record<string, string>): ReturnType<typeof buildGraphFromServices> {
  const newNodes = graph.nodes.map((node) => {
    // Try to match node label or service name to a directory in sourceMap
    const labelLower = node.label.toLowerCase();
    const serviceLower = node.serviceName.toLowerCase();
    
    // Find best match
    let bestMatch: string | null = null;
    for (const [dir, url] of Object.entries(sourceMap)) {
      const dirLower = dir.toLowerCase();
      // Match if directory name appears in label or service name
      if (labelLower.includes(dirLower) || serviceLower.includes(dirLower) || dirLower.includes(labelLower)) {
        if (!bestMatch || dir.length > bestMatch.length) {
          bestMatch = dir;
        }
      }
    }
    
    if (bestMatch) {
      return { ...node, docLink: sourceMap[bestMatch] };
    }
    return node;
  });
  
  return { ...graph, nodes: newNodes };
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

// Pre-warm cache: generate all templates on server startup so first requests are instant.
// This avoids the 5-7s LLM parse latency for template-based requests.
let warmed = false;
let warming = false;

export async function warmupCache(): Promise<void> {
  if (warmed || warming) return;
  warming = true;
  try {
    // Generate each template in both themes (light + dark) to cover common requests
    const themes: Array<"light" | "dark"> = ["light", "dark"];
    const layouts: Array<"auto" | "vertical"> = ["auto", "vertical"];
    const tasks: Promise<unknown>[] = [];
    for (const tpl of TEMPLATES) {
      for (const theme of themes) {
        for (const layout of layouts) {
          tasks.push(
            generateDiagram({
              templateId: tpl.id,
              style: { theme, layout },
              useCache: true,
            }).catch((err) => {
              console.warn(`[vizarch] warmup failed for ${tpl.id} (${theme}/${layout}):`, (err as Error).message);
            }),
          );
        }
      }
    }
    await Promise.all(tasks);
    warmed = true;
    console.log(`[vizarch] cache warmed: ${TEMPLATES.length} templates × ${themes.length} themes × ${layouts.length} layouts = ${tasks.length} entries`);
  } finally {
    warming = false;
  }
}

export function isWarmedUp(): boolean {
  return warmed;
}

// Batch generate: process multiple diagrams in parallel
export async function batchGenerate(
  requests: GenerateRequest[],
): Promise<{ results: (DiagramResult | { error: string })[]; totalMs: number }> {
  const t0 = Date.now();
  const results = await Promise.all(
    requests.map(async (req) => {
      try {
        return await generateDiagram(req);
      } catch (err) {
        return { error: (err as Error).message };
      }
    }),
  );
  return { results, totalMs: Date.now() - t0 };
}
