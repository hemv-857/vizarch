"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Search, X } from "lucide-react";

// Node search bar: floating overlay at the top of the canvas.
// Typing filters/highlights matching nodes. Enter selects the first match.
export function NodeSearchBar() {
  const graph = useDiagramStore((s) => s.graph);
  const setSelectedNode = useDiagramStore((s) => s.setSelectedNode);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+F to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
      if (e.key === "Escape" && focused) {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused]);

  const matches = useMemo(() => {
    if (!query.trim() || !graph) return [];
    const q = query.toLowerCase().trim();
    return graph.nodes
      .filter((n) => !n.hidden)
      .filter((n) =>
        n.label.toLowerCase().includes(q) ||
        n.serviceName.toLowerCase().includes(q) ||
        n.serviceId.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.provider.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((n) => n.id);
  }, [query, graph]);

  function selectMatch(id: string) {
    setSelectedNode(id);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  if (!graph) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 w-64 max-w-[60%]">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setTimeout(() => { setFocused(false); setOpen(false); }, 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches.length > 0) {
              e.preventDefault();
              selectMatch(matches[0]);
            }
          }}
          placeholder="Search nodes… (⌘F)"
          className="h-7 w-full pl-7 pr-7 text-[11px] rounded-md border border-border bg-background/90 backdrop-blur shadow-sm outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 transition"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <div className="absolute top-8 left-0 right-0 rounded-md border border-border bg-popover shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          <ul className="py-0.5 text-[11px]">
            {matches.map((id) => {
              const node = graph?.nodes.find((n) => n.id === id);
              if (!node) return null;
              return (
                <li key={id}>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); selectMatch(id); }}
                    className="w-full flex items-center gap-2 px-2 py-1 hover:bg-accent text-left"
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: node.customColor ?? "#3b82f6" }}
                    />
                    <span className="truncate flex-1">{node.label}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0">{node.id}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
