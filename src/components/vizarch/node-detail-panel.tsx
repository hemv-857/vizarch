"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Copy,
  Trash2,
  X,
  Link2,
  ArrowRight,
} from "lucide-react";
import { getProviderLabel, getTypeLabel, TYPE_COLORS } from "@/lib/vizarch/services";
import { toast } from "sonner";

const BRAND_PALETTE = [
  "#3b82f6", "#22c55e", "#f97316", "#f59e0b",
  "#a855f7", "#ec4899", "#10b981", "#0ea5e9",
  "#ef4444", "#d946ef", "#14b8a6", "#64748b",
];

export function NodeDetailPanel() {
  const selectedId = useDiagramStore((s) => s.selectedNodeId);
  const graph = useDiagramStore((s) => s.graph);
  const updateNode = useDiagramStore((s) => s.updateNode);
  const deleteNode = useDiagramStore((s) => s.deleteNode);
  const duplicateNode = useDiagramStore((s) => s.duplicateNode);
  const setNodeColor = useDiagramStore((s) => s.setNodeColor);
  const setSelectedNode = useDiagramStore((s) => s.setSelectedNode);
  const setConnectMode = useDiagramStore((s) => s.setConnectMode);
  const connectModeFromId = useDiagramStore((s) => s.connectModeFromId);

  if (!graph || !selectedId) return null;
  const node = graph.nodes.find((n) => n.id === selectedId);
  if (!node) return null;

  const incoming = graph.edges.filter((e) => e.to === node.id);
  const outgoing = graph.edges.filter((e) => e.from === node.id);

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Node detail</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setSelectedNode(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: (node.customColor ?? TYPE_COLORS[node.type] ?? "#3b82f6") + "22" }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={node.customColor ?? TYPE_COLORS[node.type] ?? "#3b82f6"} strokeWidth={1.6}>
              <path d={node.iconPath} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{node.serviceName}</div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-4">
                {getProviderLabel(node.provider)}
              </Badge>
              <Badge variant="secondary" className="text-[10px] h-4">
                {getTypeLabel(node.type)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Custom label</Label>
          <Input
            value={node.label}
            onChange={(e) => updateNode(node.id, { label: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        {node.description && (
          <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground leading-relaxed">
            {node.description}
          </div>
        )}

        {/* Color picker */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Custom color</Label>
          <div className="grid grid-cols-6 gap-1.5">
            {BRAND_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setNodeColor(node.id, c)}
                className={`h-6 w-6 rounded border-2 transition ${
                  node.customColor === c ? "border-foreground" : "border-transparent"
                } hover:scale-110`}
                style={{ background: c }}
                title={c}
              />
            ))}
            <button
              onClick={() => setNodeColor(node.id, null)}
              className="h-6 w-6 rounded border border-border text-[10px] hover:bg-accent flex items-center justify-center"
              title="Reset to default"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Connections summary */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-border p-2">
            <div className="font-medium text-muted-foreground">Incoming</div>
            <div className="text-base font-semibold">{incoming.length}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {incoming.slice(0, 3).map((e) => graph.nodes.find((n) => n.id === e.from)?.label).join(", ") || "—"}
            </div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="font-medium text-muted-foreground">Outgoing</div>
            <div className="text-base font-semibold">{outgoing.length}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {outgoing.slice(0, 3).map((e) => graph.nodes.find((n) => n.id === e.to)?.label).join(", ") || "—"}
            </div>
          </div>
        </div>

        {/* Connect to another node */}
        {connectModeFromId === node.id ? (
          <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 text-[11px] text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowRight className="h-3 w-3 animate-pulse" />
              <span className="font-medium">Connect mode active</span>
            </div>
            <div className="text-[10px] mb-1.5">
              Click any other node in the canvas to create a connection from <strong>{node.label}</strong>.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-full text-[10px]"
              onClick={() => setConnectMode(null)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => {
              setConnectMode(node.id);
              toast.info(`Click another node to connect from "${node.label}"`);
            }}
          >
            <Link2 className="h-3.5 w-3.5 mr-1.5" />Connect to another node
          </Button>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1"
            onClick={() => {
              duplicateNode(node.id);
              toast.success("Node duplicated");
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-destructive hover:bg-destructive/10"
            onClick={() => {
              deleteNode(node.id);
              toast.success("Node deleted");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />Delete
          </Button>
        </div>

        {node.docLink && (
          <a
            href={node.docLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-teal-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />View official docs
          </a>
        )}
      </CardContent>
    </Card>
  );
}
