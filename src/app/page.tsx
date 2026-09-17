"use client";

import { useEffect, useRef } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { buildSvg } from "@/lib/vizarch/svg-builder";
import { layoutGraph } from "@/lib/vizarch/layout-engine";
import { getTemplateById } from "@/lib/vizarch/templates";
import { resolveServiceByName } from "@/lib/vizarch/services";
import { buildGraphFromServices, DEFAULT_STYLE } from "@/lib/vizarch/types";
import { VizarchHeader } from "@/components/vizarch/header";
import { TextInputPanel } from "@/components/vizarch/text-input-panel";
import { DiagramCanvas } from "@/components/vizarch/diagram-canvas";
import { CustomizationPanel } from "@/components/vizarch/customization-panel";
import { ExportPanel } from "@/components/vizarch/export-panel";
import { NodeDetailPanel } from "@/components/vizarch/node-detail-panel";
import { VizarchFooter } from "@/components/vizarch/footer";
import { ServicesCatalogDialog } from "@/components/vizarch/services-catalog-dialog";
import { MetaStats } from "@/components/vizarch/meta-stats";
import { Toaster } from "sonner";

const DEFAULT_DESCRIPTION =
  "React frontend on Vercel, Node.js API on Lambda, PostgreSQL on RDS, Redis cache, S3 storage, CloudFront CDN, SNS notifications, Datadog monitoring";

export default function Home() {
  const store = useDiagramStore();
  const didInit = useRef(false);

  // On first mount, kick off an initial generation so the page is never empty.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void generateInitial(store);
    // store is a stable Zustand singleton; effect should only run once.
  }, [store]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30 text-foreground">
      <VizarchHeader />
      <main className="flex-1 flex flex-col gap-3 px-3 sm:px-4 lg:px-6 pb-4">
        {/* Top: input panel */}
        <section
          aria-label="Architecture description input"
          className="w-full"
        >
          <TextInputPanel />
        </section>

        {/* Middle: meta stats + toolbar */}
        {store.meta && (
          <section aria-label="Diagram metadata">
            <MetaStats />
          </section>
        )}

        {/* Lower: canvas + side panels */}
        <section
          aria-label="Diagram editor"
          className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 flex-1 min-h-[480px]"
        >
          <div className="min-h-[440px] lg:min-h-[520px] h-full order-1">
            <DiagramCanvas />
          </div>
          <div className="order-2 flex flex-col gap-3">
            {store.selectedNodeId ? <NodeDetailPanel /> : <CustomizationPanel />}
            {store.showExport && <ExportPanel />}
          </div>
        </section>
      </main>
      <VizarchFooter />
      <ServicesCatalogDialog />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

async function generateInitial(store: ReturnType<typeof useDiagramStore>) {
  // If a share slug is in the URL, load the saved diagram instead.
  const url = new URL(window.location.href);
  const shareSlug = url.searchParams.get("share");
  if (shareSlug) {
    try {
      const res = await fetch(`/api/diagrams/${encodeURIComponent(shareSlug)}`);
      if (res.ok) {
        const data = await res.json();
        const diagram = data.diagram;
        const graph = JSON.parse(diagram.graphJson);
        const style = diagram.styleJson ? JSON.parse(diagram.styleJson) : DEFAULT_STYLE;
        store.applyGraph(graph, diagram.svgCache, 0, 0, {
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          parseTimeMs: 0,
          layoutTimeMs: 0,
          exportTimeMs: 0,
          cacheHit: false,
          confidence: 1,
          ambiguities: [],
        });
        store.setStyle(style);
        store.setDescription(diagram.description ?? "");
        store.setShare(shareSlug, window.location.href);
        // Re-render to compute width/height client-side
        store.rerender();
        return;
      }
    } catch (err) {
      console.warn("[vizarch] failed to load shared diagram:", (err as Error).message);
    }
  }

  // Default: kick off an LLM parse with the default description.
  store.setDescription(DEFAULT_DESCRIPTION);
  try {
    const res = await fetch("/api/v1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: DEFAULT_DESCRIPTION,
        style: { layout: "horizontal", theme: "light" },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    store.applyGraph(data.graph, data.svg, data.width, data.height, data.meta);
    store.setStyle(data.graph.style ?? DEFAULT_STYLE);
  } catch (err) {
    // Fallback: render template client-side
    const tpl = getTemplateById("serverless-aws")!;
    const services = tpl.nodes
      .map((n) => {
        const meta = resolveServiceByName(n.service);
        if (!meta) return null;
        return { id: n.id, service: meta, label: n.label };
      })
      .filter(Boolean) as any;
    const graph = buildGraphFromServices(services, tpl.edges);
    graph.style = { ...DEFAULT_STYLE, layout: "horizontal", theme: "light" };
    layoutGraph(graph, { orientation: "horizontal" });
    const { svg, width, height } = buildSvg(graph, { theme: "light" });
    store.applyGraph(graph, svg, width, height, {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      parseTimeMs: 0,
      layoutTimeMs: 0,
      exportTimeMs: 0,
      cacheHit: false,
      confidence: 1,
      ambiguities: [],
    });
    store.setError(null);
    console.warn("[vizarch] initial LLM call failed; rendered template:", (err as Error).message);
  }
}
