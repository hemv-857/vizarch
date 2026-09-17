"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Boxes,
  ArrowRight,
  Zap,
  Clock,
  Database,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export function MetaStats() {
  const meta = useDiagramStore((s) => s.meta);
  if (!meta) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm p-3 flex items-center gap-3 sm:gap-4 flex-wrap text-[11px]">
      <div className="flex items-center gap-1.5">
        <Boxes className="h-3.5 w-3.5 text-teal-600" />
        <span className="font-semibold tabular-nums">{meta.nodeCount}</span>
        <span className="text-muted-foreground">nodes</span>
      </div>
      <div className="h-3.5 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
        <span className="font-semibold tabular-nums">{meta.edgeCount}</span>
        <span className="text-muted-foreground">edges</span>
      </div>
      <div className="h-3.5 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        <span className="font-semibold tabular-nums">{meta.parseTimeMs}</span>
        <span className="text-muted-foreground">ms parse</span>
      </div>
      <div className="h-3.5 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-purple-600" />
        <span className="font-semibold tabular-nums">{meta.layoutTimeMs + meta.exportTimeMs}</span>
        <span className="text-muted-foreground">ms layout + render</span>
      </div>
      <div className="h-3.5 w-px bg-border" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              {meta.cacheHit ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Database className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span className="font-medium">{meta.cacheHit ? "cached" : "fresh"}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {meta.cacheHit ? "Served from in-memory cache (<100ms)" : "Generated via Claude API"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {typeof meta.confidence === "number" && (
        <>
          <div className="h-3.5 w-px bg-border" />
          <Badge variant="secondary" className="text-[10px]">
            confidence {Math.round(meta.confidence * 100)}%
          </Badge>
        </>
      )}
      {meta.ambiguities && meta.ambiguities.length > 0 && (
        <>
          <div className="h-3.5 w-px bg-border" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="font-medium">{meta.ambiguities.length} ambiguous</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <ul className="list-disc pl-3 space-y-0.5">
                  {meta.ambiguities.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  );
}
