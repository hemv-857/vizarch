"use client";

import { Github, Boxes, Heart } from "lucide-react";

export function VizarchFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
            <Boxes className="h-3 w-3" />
          </div>
          <span>
            <span className="font-semibold text-foreground">vizarch</span> · AI architecture diagrams
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground flex items-center gap-1">
            <Github className="h-3 w-3" />Source
          </a>
          <span className="hidden sm:inline">·</span>
          <span>
            Powered by <span className="text-foreground font-medium">Claude</span> +{" "}
            <span className="text-foreground font-medium">Sugiyama</span> layout
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="flex items-center gap-1">
            Built with <Heart className="h-2.5 w-2.5 text-rose-500" /> for engineers
          </span>
        </div>
      </div>
    </footer>
  );
}
