"use client";

import { useEffect, useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import { toast } from "sonner";

interface Annotation {
  id: string;
  nodeId: string;
  author: string;
  text: string;
  createdAt: string;
}

export function NodeAnnotations({ nodeId }: { nodeId: string }) {
  const storeSlug = useDiagramStore((s) => s.shareSlug);
  // Also check URL for share slug as fallback
  const [urlSlug, setUrlSlug] = useState<string | null>(null);
  useEffect(() => {
    setUrlSlug(new URLSearchParams(window.location.search).get("share"));
  }, []);
  const shareSlug = storeSlug ?? urlSlug;

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("Anonymous");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!shareSlug || !nodeId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/diagrams/${shareSlug}/annotations?nodeId=${encodeURIComponent(nodeId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAnnotations(data.annotations ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load annotations");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareSlug, nodeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shareSlug || !text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/diagrams/${shareSlug}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, author: author || "Anonymous", text: text.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnnotations((prev) => [...prev, data.annotation]);
      setText("");
      toast.success("Annotation added");
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!shareSlug) return;
    try {
      const res = await fetch(`/api/diagrams/${shareSlug}/annotations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      toast.success("Annotation removed");
    } catch (err) {
      // Remove locally even if API fails (optimistic)
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      toast.error(`Delete failed: ${(err as Error).message}`);
    }
  }

  if (!shareSlug) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-center">
        <MessageSquare className="h-4 w-4 mx-auto mb-1 text-muted-foreground opacity-50" />
        <div className="text-[11px] text-muted-foreground">
          Save a share link to enable annotations
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
        <span className="text-[11px] font-medium text-foreground">Annotations</span>
        {annotations.length > 0 && (
          <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{annotations.length}</Badge>
        )}
      </div>

      {/* Existing annotations */}
      {loading ? (
        <div className="text-[10px] text-muted-foreground text-center py-2">Loading…</div>
      ) : annotations.length === 0 ? (
        <div className="text-[10px] text-muted-foreground text-center py-2 border border-dashed border-border rounded-md">
          No annotations yet
        </div>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {annotations.map((a) => (
            <div key={a.id} className="group rounded-md border border-border bg-muted/30 p-2 text-[11px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-500/20 text-teal-600">
                  <User className="h-2.5 w-2.5" />
                </div>
                <span className="font-medium text-foreground">{a.author}</span>
                <span className="text-[9px] text-muted-foreground ml-auto">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
              <p className="text-foreground/80 leading-relaxed">{a.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add annotation form */}
      <form onSubmit={handleSubmit} className="space-y-1.5">
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
          className="h-6 text-[10px] px-2"
        />
        <div className="flex gap-1.5">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="h-7 text-[11px] flex-1"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 shrink-0"
            disabled={!text.trim() || submitting}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </form>
    </div>
  );
}
