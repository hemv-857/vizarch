"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Github,
  Sparkles,
  Moon,
  Sun,
  Keyboard,
  History,
  PanelRightOpen,
} from "lucide-react";
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
  const toggleShortcuts = useDiagramStore((s) => s.toggleShortcutsHelp);
  const toggleRecent = useDiagramStore((s) => s.toggleRecentPanel);
  const darkMode = useDiagramStore((s) => s.darkMode);
  const toggleDarkMode = useDiagramStore((s) => s.toggleDarkMode);

  // Sync dark class on mount (in case store was loaded from localStorage)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md shrink-0">
      <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm hover:shadow-md transition-shadow shrink-0"
            aria-label="vizarch home"
          >
            <Boxes className="h-4.5 w-4.5" />
          </a>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight">vizarch</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4.5 hidden sm:inline-flex">
                <Sparkles className="h-2.5 w-2.5 mr-1" />AI
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground truncate hidden sm:block">
              Architecture diagram generator
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={toggleRecent}
                  title="Recent diagrams"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden md:inline ml-1.5 text-xs">Recent</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Recent saved diagrams</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={toggleCatalog}
                >
                  <Boxes className="h-4 w-4" />
                  <span className="hidden md:inline ml-1.5 text-xs">Services</span>
                  <span className="text-[10px] ml-1 text-muted-foreground hidden lg:inline">200+</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Browse the service catalog (200+ icons)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={toggleShortcuts}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard shortcuts (?</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={toggleDarkMode}
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle {darkMode ? "light" : "dark"} mode</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open("https://github.com", "_blank", "noopener")}
                >
                  <Github className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View source on GitHub</TooltipContent>
            </Tooltip>

            <Button
              size="sm"
              className="h-8 ml-1 bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
              onClick={toggleExport}
            >
              <PanelRightOpen className="h-3.5 w-3.5 mr-1.5" />
              Share / Export
            </Button>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
