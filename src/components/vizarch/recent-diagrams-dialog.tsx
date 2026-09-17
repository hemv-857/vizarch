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
import { Loader2, ExternalLink, Trash2, FileBox, Clock } from "lucide-react";
import { toast } from "sonner";

interface SavedDiagram {
  id: string;
  slug: string;
  title: string | null;
  description: string;
  viewCount: number;
  createdAt: string;
}

export function RecentDiagramsDialog() {
  const open = useDiagramStore((s) => s.showRecentPanel);
  const setOpen = useDiagramStore((s) => s.toggleRecentPanel);
  const [items, setItems] = useState<SavedDiagram[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/diagrams")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data.diagrams ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load recent diagrams");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this saved diagram? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/diagrams/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((d) => d.slug !== slug));
      toast.success("Diagram deleted");
    } catch (err) {
      toast.error(`Delete failed: ${(err as Error).message}`);
    }
  }

  function handleOpen(slug: string) {
    window.location.href = `/?share=${slug}`;
  }

  return (
    <Dialog open={open} onOpenChange={() => setOpen()}>
      <DialogContent className="max-w-2xl w-[94vw] h-[70vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-teal-600" />
            Recent diagrams
            <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Diagrams you've saved as share links. Click to open, or delete to remove.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading saved diagrams…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-12">
              <FileBox className="h-6 w-6 opacity-50" />
              <div className="text-sm">No saved diagrams yet</div>
              <div className="text-[11px]">Generate a diagram, then click "Share / Export" → "Generate share link" to save one.</div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((d) => (
                <li
                  key={d.id}
                  className="flex items-start gap-3 p-3 hover:bg-accent/40 transition group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">
                        {d.title ?? "Untitled diagram"}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {d.viewCount} view{d.viewCount === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate font-mono">
                      {d.description.slice(0, 100)}
                      {d.description.length > 100 ? "…" : ""}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      <code className="font-mono">/?share={d.slug}</code>
                      <span className="mx-1.5">·</span>
                      {new Date(d.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleOpen(d.slug)}
                      title="Open"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(d.slug)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
