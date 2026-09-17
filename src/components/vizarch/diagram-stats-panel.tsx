"use client";

import { useMemo } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, Server, ArrowRight } from "lucide-react";
import { getProviderLabel, getTypeLabel } from "@/lib/vizarch/services";
import type { ServiceProvider, ServiceType } from "@/lib/vizarch/services";

export function DiagramStatsPanel() {
  const graph = useDiagramStore((s) => s.graph);
  const setSelectedNode = useDiagramStore((s) => s.setSelectedNode);

  const stats = useMemo(() => {
    if (!graph) return null;
    const providerCounts = new Map<ServiceProvider, number>();
    const typeCounts = new Map<ServiceType, number>();
    for (const n of graph.nodes) {
      if (n.hidden) continue;
      providerCounts.set(n.provider, (providerCounts.get(n.provider) ?? 0) + 1);
      typeCounts.set(n.type, (typeCounts.get(n.type) ?? 0) + 1);
    }
    const providers = Array.from(providerCounts.entries()).sort((a, b) => b[1] - a[1]);
    const types = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
    return {
      totalNodes: graph.nodes.filter((n) => !n.hidden).length,
      totalEdges: graph.edges.filter((e) => !e.hidden).length,
      providers,
      types,
    };
  }, [graph]);

  if (!stats) return null;

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PieChart className="h-4 w-4 text-teal-600" />
          Diagram stats
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Top-level numbers */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
            <Server className="h-3.5 w-3.5 text-teal-600 mx-auto mb-0.5" />
            <div className="text-lg font-bold text-foreground">{stats.totalNodes}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">nodes</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2 text-center">
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-0.5" />
            <div className="text-lg font-bold text-foreground">{stats.totalEdges}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">edges</div>
          </div>
        </div>

        {/* Provider breakdown */}
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">By provider</div>
          <div className="space-y-1">
            {stats.providers.map(([prov, count]) => {
              const pct = (count / stats.totalNodes) * 100;
              return (
                <div key={prov} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-20 truncate text-foreground/80">{getProviderLabel(prov)}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Type breakdown (compact badges) */}
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">By type</div>
          <div className="flex flex-wrap gap-1">
            {stats.types.map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-[9px] h-4 px-1">
                {getTypeLabel(type)}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {/* Node list (clickable) */}
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
            <BarChart3 className="h-2.5 w-2.5" />Node list
          </div>
          <div className="max-h-32 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {graph?.nodes.filter((n) => !n.hidden).map((n) => (
              <button
                key={n.id}
                onClick={() => setSelectedNode(n.id)}
                className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent text-left text-[10px] transition"
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: n.customColor ?? TYPE_COLOR[n.type] ?? "#3b82f6" }}
                />
                <span className="truncate flex-1 text-foreground/90">{n.label}</span>
                <span className="text-[8px] text-muted-foreground shrink-0">{n.id}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const TYPE_COLOR: Record<string, string> = {
  compute: "#3b82f6",
  container: "#06b6d4",
  database: "#f97316",
  cache: "#22c55e",
  storage: "#f59e0b",
  cdn: "#a855f7",
  messaging: "#ec4899",
  queue: "#10b981",
  networking: "#6366f1",
  analytics: "#8b5cf6",
  monitoring: "#0ea5e9",
  security: "#ef4444",
  ai: "#d946ef",
  frontend: "#14b8a6",
  external: "#64748b",
  client: "#475569",
};
