"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, Link2 } from "lucide-react";
import { PROTOCOL_COLORS } from "@/lib/vizarch/services";
import { toast } from "sonner";

const PROTOCOL_OPTIONS = [
  "https", "http", "grpc", "postgres", "mysql", "redis",
  "db", "event", "sqs", "sns", "amqp", "mqtt", "websocket",
  "tcp", "udp", "direct",
];

const EDGE_STYLES = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

export function EdgeDetailPanel() {
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId);
  const graph = useDiagramStore((s) => s.graph);
  const updateEdge = useDiagramStore((s) => s.updateEdge);
  const deleteEdge = useDiagramStore((s) => s.deleteEdge);
  const setSelectedEdge = useDiagramStore((s) => s.setSelectedEdge);

  if (!graph || !selectedEdgeId) return null;
  const edge = graph.edges.find((e) => e.id === selectedEdgeId);
  if (!edge) return null;

  const fromNode = graph.nodes.find((n) => n.id === edge.from);
  const toNode = graph.nodes.find((n) => n.id === edge.to);
  const proto = (edge.protocol ?? "direct").toLowerCase();
  const color = PROTOCOL_COLORS[proto] ?? "#94a3b8";

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-teal-600" />
            Connection
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setSelectedEdge(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Connection visualization */}
        <div className="flex items-center gap-2 rounded-md border border-border p-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">From</div>
            <div className="text-sm font-medium truncate">{fromNode?.label ?? edge.from}</div>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="h-0.5 w-10" style={{ background: color }} />
            <span className="text-[9px] text-muted-foreground">{edge.protocol ?? "direct"}</span>
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">To</div>
            <div className="text-sm font-medium truncate">{toNode?.label ?? edge.to}</div>
          </div>
        </div>

        {/* Protocol selector */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Protocol</Label>
          <div className="flex flex-wrap gap-1">
            {PROTOCOL_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => updateEdge(edge.id, { protocol: p })}
                className={`px-2 py-1 rounded text-[10px] border transition ${
                  proto === p
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                    : "border-border hover:bg-accent"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1 align-middle"
                  style={{ background: PROTOCOL_COLORS[p] ?? "#94a3b8" }}
                />
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Edge label */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Label (optional)</Label>
          <Input
            value={edge.label ?? ""}
            onChange={(e) => updateEdge(edge.id, { label: e.target.value || undefined })}
            placeholder="e.g. invoke, query, publish..."
            className="h-8 text-sm"
          />
        </div>

        {/* Edge style */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Line style</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {EDGE_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => updateEdge(edge.id, { style: s.value })}
                className={`px-2 py-1.5 rounded-md border text-[11px] transition ${
                  (edge.style ?? "solid") === s.value
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
                    : "border-border hover:bg-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className="text-[10px]">
            edge.id: {edge.id}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 text-destructive hover:bg-destructive/10"
            onClick={() => {
              deleteEdge(edge.id);
              toast.success("Connection deleted");
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
