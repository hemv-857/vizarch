"use client";

import { Github, Boxes, Heart } from "lucide-react";

export function VizarchFooter() {
  return (
    <footer className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-md">
      <div className="px-4 py-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
            <Boxes className="h-2.5 w-2.5" />
          </div>
          <span className="font-semibold text-foreground">vizarch</span>
          <span className="hidden sm:inline">· AI architecture diagrams</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground flex items-center gap-0.5">
            <Github className="h-2.5 w-2.5" />Source
          </a>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">
            Powered by <span className="text-foreground font-medium">Claude</span> +{" "}
            <span className="text-foreground font-medium">Sugiyama</span>
          </span>
          <span className="hidden lg:inline">·</span>
          <span className="hidden lg:inline flex items-center gap-0.5">
            Built with <Heart className="h-2 w-2 text-rose-500" /> for engineers
          </span>
        </div>
      </div>
    </footer>
  );
}
