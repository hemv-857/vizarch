"use client";

import { useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { layoutGraph } from "@/lib/vizarch/layout-engine";
import { buildSvg } from "@/lib/vizarch/svg-builder";
import type { ArchGraph } from "@/lib/vizarch/types";
import { DEFAULT_STYLE } from "@/lib/vizarch/types";

export function ImportJsonDialog() {
  const open = useDiagramStore((s) => s.showImportJson);
  const setOpen = useDiagramStore((s) => s.toggleImportJson);
  const applyGraph = useDiagramStore((s) => s.applyGraph);
  const setStyle = useDiagramStore((s) => s.setStyle);
  const setDescription = useDiagramStore((s) => s.setDescription);
  const setDiagramTitle = useDiagramStore((s) => s.setDiagramTitle);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleImport() {
    setError(null);
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonText);
      // Validate it has nodes and edges
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        throw new Error("JSON must have a 'nodes' array");
      }
      if (!parsed.edges || !Array.isArray(parsed.edges)) {
        throw new Error("JSON must have an 'edges' array");
      }
      // Validate each node has required fields
      for (const n of parsed.nodes) {
        if (!n.id || !n.serviceId || !n.label) {
          throw new Error(`Node missing required field (id, serviceId, or label): ${JSON.stringify(n).slice(0, 80)}`);
        }
      }

      const graph = parsed as ArchGraph;
      const style = { ...DEFAULT_STYLE, ...(parsed.style ?? {}) };
      graph.style = style;

      // Run layout and render
      layoutGraph(graph, {
        orientation: style.layout === "vertical" || style.layout === "hierarchical" ? "vertical" : "horizontal",
      });
      const { svg, width, height } = buildSvg(graph, {
        theme: style.theme,
        showEdgeLabels: style.showEdgeLabels,
        showNodeLabels: style.showLabels,
        iconSize: style.iconSize,
      });

      applyGraph(graph, svg, width, height, {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        parseTimeMs: 0,
        layoutTimeMs: 0,
        exportTimeMs: 0,
        cacheHit: false,
        confidence: 1,
        ambiguities: [],
      });
      setStyle(style);
      if (parsed.title) setDiagramTitle(parsed.title);
      setDescription(parsed.description ?? "Imported from JSON");

      toast.success(`Imported ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
      setOpen();
      setJsonText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJsonText(reader.result as string);
    };
    reader.readAsText(file);
  }

  return (
    <Dialog open={open} onOpenChange={() => setOpen()}>
      <DialogContent className="max-w-2xl w-[94vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-teal-600" />
            Import diagram from JSON
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Paste a previously exported JSON diagram, or upload a .json file. The diagram will load into the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 p-4 space-y-3">
          {/* File upload */}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-accent transition">
                <Upload className="h-3.5 w-3.5" />Choose .json file…
              </span>
            </label>
            <span className="text-[10px] text-muted-foreground">or paste JSON below</span>
          </div>

          {/* JSON textarea */}
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"nodes": [{"id": "n1", "label": "React", "serviceId": "generic.frontend", ...}], "edges": [...], "style": {...}}'
            className="w-full min-h-[200px] max-h-[300px] resize-y rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono leading-relaxed outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 transition"
          />

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="font-mono">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setJsonText(""); setError(null); setOpen(); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              onClick={handleImport}
              disabled={!jsonText.trim() || loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              Import diagram
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
