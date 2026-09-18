"use client";

import { useEffect, useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, RotateCcw, GitBranch, Clock } from "lucide-react";
import { toast } from "sonner";

interface Version {
  id: string;
  version: number;
  changeSummary: string | null;
  createdAt: string;
}

export function VersionHistoryDialog() {
  const open = useDiagramStore((s) => s.showVersionHistory);
  const setOpen = useDiagramStore((s) => s.toggleVersionHistory);
  const storeSlug = useDiagramStore((s) => s.shareSlug);
  // Also check URL for share slug as fallback (store may not have it set yet during init)
  const [urlSlug, setUrlSlug] = useState<string | null>(null);
  useEffect(() => {
    setUrlSlug(new URLSearchParams(window.location.search).get("share"));
  }, []);
  const shareSlug = storeSlug ?? urlSlug;
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !shareSlug) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/diagrams/${shareSlug}/versions`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setVersions(data.versions ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load versions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, shareSlug]);

  async function handleRestore(ver: Version) {
    if (!shareSlug) return;
    setRestoring(ver.version);
    try {
      const res = await fetch(
        `/api/diagrams/${shareSlug}/versions/${ver.version}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const graph = JSON.parse(data.version.graphJson);
      const style = data.version.styleJson
        ? JSON.parse(data.version.styleJson)
        : undefined;
      const svgCache = data.version.svgCache;
      const store = useDiagramStore.getState();
      store.applyGraph(graph, svgCache ?? "", 0, 0, {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        parseTimeMs: 0,
        layoutTimeMs: 0,
        exportTimeMs: 0,
        cacheHit: false,
        confidence: 1,
        ambiguities: [],
      });
      if (style) store.setStyle(style);
      store.rerender();
      toast.success(`Restored version ${ver.version}`);
      setOpen();
    } catch (err) {
      toast.error(`Restore failed: ${(err as Error).message}`);
    } finally {
      setRestoring(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => setOpen()}>
      <DialogContent className="max-w-lg w-[94vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-teal-600" />
            Version history
            <Badge variant="secondary" className="text-[10px]">{versions.length}</Badge>
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {shareSlug
              ? `Browse and restore previous versions of diagram ${shareSlug}`
              : "Save a share link first to enable version history"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto max-h-[60vh]">
          {!shareSlug ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <History className="h-6 w-6 opacity-50" />
              <div className="text-sm">No saved diagram</div>
              <div className="text-[11px] text-center max-w-xs">
                Click "Share / Export" → "Generate share link" to start tracking versions.
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading versions…</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Clock className="h-6 w-6 opacity-50" />
              <div className="text-sm">No versions yet</div>
              <div className="text-[11px]">Save a new version from the export panel.</div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {versions.map((v, i) => (
                <li
                  key={v.id}
                  className="flex items-start gap-3 p-3 hover:bg-accent/40 transition group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 text-[11px] font-bold shrink-0">
                    v{v.version}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {v.changeSummary || `Version ${v.version}`}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(v.createdAt).toLocaleString()}
                      {i === 0 && (
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 ml-1">latest</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] shrink-0 opacity-0 group-hover:opacity-100 transition"
                    disabled={restoring === v.version || i === 0}
                    onClick={() => handleRestore(v)}
                    title={i === 0 ? "Current version" : "Restore this version"}
                  >
                    {restoring === v.version ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3 mr-1" />
                    )}
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
