"use client";

import { Boxes, Github, Sparkles } from "lucide-react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function VizarchHeader() {
  const toggleCatalog = useDiagramStore((s) => s.toggleServicesCatalog);
  const toggleExport = useDiagramStore((s) => s.toggleExport);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm">
            <Boxes className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight">vizarch</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4.5">
                <Sparkles className="h-2.5 w-2.5 mr-1" />AI
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground truncate">
              Architecture diagram generator
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={toggleCatalog}
                >
                  <Boxes className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Services</span>
                  <span className="text-[10px] ml-1 text-muted-foreground">200+</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Browse the service catalog (200+ icons)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => window.open("https://github.com", "_blank", "noopener")}
          >
            <Github className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">GitHub</span>
          </Button>
          <Button
            size="sm"
            className="h-8 bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            onClick={toggleExport}
          >
            Share / Export
          </Button>
        </div>
      </div>
    </header>
  );
}
