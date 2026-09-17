"use client";

import { useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  Share2,
  FileImage,
  FileJson,
  FileText,
  FileCode,
  Link as LinkIcon,
  QrCode,
  Copy,
  Loader2,
} from "lucide-react";
import {
  exportJson,
  exportMarkdown,
  downloadSvg,
  downloadText,
  exportPngBrowser,
  triggerDownload,
} from "@/lib/vizarch/exporters";
import { toast } from "sonner";

const FORMATS = [
  { id: "png", name: "PNG", icon: FileImage, hint: "Raster · 2x resolution", mime: "image/png" },
  { id: "svg", name: "SVG", icon: FileCode, hint: "Vector · scalable", mime: "image/svg+xml" },
  { id: "pdf", name: "PDF", icon: FileText, hint: "Print-ready", mime: "application/pdf" },
  { id: "json", name: "JSON", icon: FileJson, hint: "Programmatic use", mime: "application/json" },
  { id: "md", name: "Markdown", icon: FileText, hint: "GitHub README", mime: "text/markdown" },
] as const;

export function ExportPanel() {
  const graph = useDiagramStore((s) => s.graph);
  const svg = useDiagramStore((s) => s.svg);
  const [busy, setBusy] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);

  async function handleExport(format: (typeof FORMATS)[number]["id"]) {
    if (!graph) {
      toast.error("No diagram to export");
      return;
    }
    setBusy(format);
    try {
      if (format === "svg") {
        downloadSvg(svg, "vizarch-architecture.svg");
        toast.success("SVG downloaded");
      } else if (format === "json") {
        downloadText(exportJson(graph), "vizarch-architecture.json", "application/json");
        toast.success("JSON downloaded");
      } else if (format === "md") {
        downloadText(exportMarkdown(graph), "vizarch-architecture.md", "text/markdown");
        toast.success("Markdown downloaded");
      } else if (format === "png") {
        const blob = await exportPngBrowser(svg, { scale: 2 });
        triggerDownload(blob, "vizarch-architecture.png");
        toast.success("PNG downloaded (2x resolution)");
      } else if (format === "pdf") {
        // Render PNG then open in print window
        const blob = await exportPngBrowser(svg, { scale: 2 });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank");
        if (w) {
          w.onload = () => w.print();
          toast.success("Opened PDF preview — use Cmd/Ctrl+P to save");
        } else {
          toast.error("Pop-up blocked — please allow pop-ups to export PDF");
        }
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (err) {
      toast.error(`Export failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    if (!graph) {
      toast.error("Nothing to share");
      return;
    }
    setBusy("share");
    try {
      const res = await fetch("/api/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: graph.nodes[0]?.label ? `${graph.nodes.length}-node architecture` : "Untitled",
          description: useDiagramStore.getState().description || "template",
          graphJson: JSON.stringify(graph),
          styleJson: JSON.stringify(graph.style ?? {}),
          svgCache: svg,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const url = `${window.location.origin}/?share=${data.diagram.slug}`;
      setShareUrl(url);
      setShareSlug(data.diagram.slug);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link copied to clipboard");
    } catch (err) {
      toast.error(`Share failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Share2 className="h-4 w-4 text-teal-600" />
          Export & Share
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-5 gap-1.5">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => handleExport(f.id)}
              disabled={busy !== null}
              className="flex flex-col items-center gap-1 px-1 py-2 rounded-md border border-border text-[10px] hover:border-teal-400/60 hover:bg-accent transition disabled:opacity-50"
              title={f.hint}
            >
              {busy === f.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <f.icon className="h-4 w-4" />
              )}
              <span className="font-medium">{f.name}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Public share link</span>
            {shareUrl && <Badge variant="secondary" className="text-[10px]">active</Badge>}
          </div>
          <Button
            onClick={handleShare}
            disabled={busy === "share"}
            className="w-full h-8 bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
          >
            {busy === "share" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate share link
          </Button>
          {shareUrl && (
            <div className="space-y-1.5">
              <Input
                readOnly
                value={shareUrl}
                className="h-8 text-[11px] font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 flex-1 text-[11px]"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    window.open(
                      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`,
                      "_blank",
                    );
                  }}
                >
                  <QrCode className="h-3 w-3 mr-1" />QR
                </Button>
              </div>
              {shareSlug && (
                <div className="text-[10px] text-muted-foreground">
                  slug: <code className="font-mono">{shareSlug}</code>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-2 text-[10px] text-muted-foreground">
          <div className="font-medium text-foreground mb-0.5">Embed code</div>
          <code className="block text-[10px] font-mono break-all leading-relaxed">
            {`<iframe src="${shareUrl ?? "https://vizarch.app/?share=..."}" width="800" height="500" frameborder="0"></iframe>`}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
