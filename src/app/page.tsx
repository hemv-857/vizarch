"use client";

import { useEffect, useRef } from "react";
import { Share2, GitFork } from "lucide-react";
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
import { EdgeDetailPanel } from "@/components/vizarch/edge-detail-panel";
import { VizarchFooter } from "@/components/vizarch/footer";
import { ServicesCatalogDialog } from "@/components/vizarch/services-catalog-dialog";
import { ShortcutsHelpDialog } from "@/components/vizarch/shortcuts-help-dialog";
import { RecentDiagramsDialog } from "@/components/vizarch/recent-diagrams-dialog";
import { DiagramStatsPanel } from "@/components/vizarch/diagram-stats-panel";
import { MetaStats } from "@/components/vizarch/meta-stats";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

const DEFAULT_DESCRIPTION =
  "React frontend on Vercel, Node.js API on Lambda, PostgreSQL on RDS, Redis cache, S3 storage, CloudFront CDN, SNS notifications, Datadog monitoring";

export default function Home() {
  const store = useDiagramStore();
  const didInit = useRef(false);
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId);
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const viewingShared = useDiagramStore((s) => s.viewingShared);
  const forkShared = useDiagramStore((s) => s.forkShared);

  // On first mount: load from localStorage OR kick off initial generation.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void initApp(store);
    // Trigger cache warmup in the background (templates × themes × layouts)
    fetch("/api/v1/warmup", { method: "POST" }).catch(() => {});
    // store is a stable Zustand singleton; effect runs only once.
  }, [store]);

  // Global keyboard shortcuts (help, undo/redo handled here so they work anywhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === "TEXTAREA" || tag === "INPUT" || (e.target as HTMLElement)?.isContentEditable;
      // ? opens help (Shift+/)
      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        useDiagramStore.getState().toggleShortcutsHelp();
        return;
      }
      if (isEditable) return;
      // Undo/redo
      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) useDiagramStore.getState().redo();
        else useDiagramStore.getState().undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        useDiagramStore.getState().redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/30 text-foreground overflow-hidden">
      <VizarchHeader />
      <main className="flex-1 flex flex-col gap-3 px-3 sm:px-4 lg:px-6 py-3 min-h-0 overflow-y-auto">
        {/* Top: input panel */}
        <section aria-label="Architecture description input" className="w-full shrink-0">
          <TextInputPanel />
        </section>

        {/* Fork banner: shown when viewing a shared diagram */}
        {viewingShared && (
          <div className="shrink-0 rounded-lg border border-teal-400/50 bg-teal-50 dark:bg-teal-950/30 px-3 py-2 flex items-center gap-2 text-xs">
            <Share2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span className="text-teal-700 dark:text-teal-300 flex-1">
              You're viewing a shared diagram. Edits won't change the original.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] border-teal-400 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50"
              onClick={forkShared}
            >
              <GitFork className="h-2.5 w-2.5 mr-1" />Fork & edit
            </Button>
          </div>
        )}

        {/* Middle: meta stats + toolbar */}
        {store.meta && (
          <section aria-label="Diagram metadata" className="shrink-0">
            <MetaStats />
          </section>
        )}

        {/* Lower: canvas + side panels (fills remaining height) */}
        <section
          aria-label="Diagram editor"
          className={`grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 flex-1 min-h-[360px] min-h-0 ${store.showSidebar ? "" : "lg:grid-cols-1"}`}
        >
          <div className="h-full min-h-[320px] order-1">
            <DiagramCanvas />
          </div>
          {store.showSidebar && (
            <div className="order-2 flex flex-col gap-3 min-h-0 overflow-y-auto max-h-[calc(100vh-180px)]">
            {selectedEdgeId ? (
              <EdgeDetailPanel key={selectedEdgeId} />
            ) : selectedNodeId ? (
              <NodeDetailPanel key={selectedNodeId} />
            ) : (
              <>
                <CustomizationPanel />
                <DiagramStatsPanel />
              </>
            )}
            {store.showExport && <ExportPanel />}
            </div>
          )}
        </section>
      </main>
      <VizarchFooter />
      <ServicesCatalogDialog />
      <ShortcutsHelpDialog />
      <RecentDiagramsDialog />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

async function initApp(store: ReturnType<typeof useDiagramStore>) {
  // 1) If a share slug is in the URL, load the saved diagram instead.
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
        store.setViewingShared(true);
        if (diagram.title) store.setDiagramTitle(diagram.title);
        store.rerender();
        return;
      }
    } catch (err) {
      console.warn("[vizarch] failed to load shared diagram:", (err as Error).message);
    }
  }

  // 2) Try to restore from localStorage (auto-save).
  try {
    const raw = window.localStorage.getItem("vizarch:autosave:v2");
    if (raw) {
      const persisted = JSON.parse(raw);
      if (persisted?.graph?.nodes?.length > 0) {
        store.loadFromStorage();
        // Still ensure dark mode class is applied
        if (persisted.darkMode) document.documentElement.classList.add("dark");
        return;
      }
    }
  } catch {
    // ignore parse errors
  }

  // 3) Default: kick off an LLM parse with the default description.
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
      .filter(Boolean) as { id: string; service: NonNullable<ReturnType<typeof resolveServiceByName>>; label?: string }[];
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
