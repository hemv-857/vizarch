"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; desc: string }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Generation",
    items: [
      { keys: ["⌘/Ctrl", "Enter"], desc: "Generate diagram from description" },
      { keys: ["?", "Shift+/",], desc: "Open this shortcuts dialog" },
    ],
  },
  {
    title: "Canvas navigation",
    items: [
      { keys: ["+"], desc: "Zoom in" },
      { keys: ["−"], desc: "Zoom out" },
      { keys: ["0"], desc: "Reset view (auto-fit)" },
      { keys: ["Drag"], desc: "Pan canvas" },
      { keys: ["Wheel"], desc: "Zoom (Ctrl/⌘+wheel for finer)" },
      { keys: ["Esc"], desc: "Deselect node / edge" },
    ],
  },
  {
    title: "Node & edge editing",
    items: [
      { keys: ["Click"], desc: "Select node / edge" },
      { keys: ["⌫/Delete"], desc: "Delete selected node" },
      { keys: ["⌘/Ctrl", "D"], desc: "Duplicate selected node" },
    ],
  },
  {
    title: "History",
    items: [
      { keys: ["⌘/Ctrl", "Z"], desc: "Undo" },
      { keys: ["⌘/Ctrl", "Shift+Z"], desc: "Redo (or ⌘/Ctrl+Y)" },
    ],
  },
];

export function ShortcutsHelpDialog() {
  const open = useDiagramStore((s) => s.showShortcutsHelp);
  const setOpen = useDiagramStore((s) => s.toggleShortcutsHelp);

  return (
    <Dialog open={open} onOpenChange={() => setOpen()}>
      <DialogContent className="max-w-2xl w-[94vw] p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm flex items-center gap-2">
            Keyboard shortcuts
            <Badge variant="secondary" className="text-[10px]">Press ?</Badge>
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Speed up your workflow with these shortcuts. Works anywhere on the page (except when typing in inputs).
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
          {GROUPS.map((g) => (
            <div key={g.title} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {g.title}
              </h3>
              <ul className="space-y-1.5">
                {g.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-foreground/90">{item.desc}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-foreground/80 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
