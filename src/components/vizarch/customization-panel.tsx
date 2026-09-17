"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Layout, Tag, Shapes, Trash2, Sun, Moon, RotateCcw } from "lucide-react";
import type { ArchStyle } from "@/lib/vizarch/types";
import { DEFAULT_STYLE } from "@/lib/vizarch/types";

const PALETTE = [
  { name: "Type-based", value: "type" as const },
  { name: "Brand color", value: "brand" as const },
  { name: "Custom", value: "custom" as const },
];

const LAYOUTS: { label: string; value: ArchStyle["layout"]; hint: string }[] = [
  { label: "Auto (LR)", value: "auto", hint: "Sugiyama hierarchical, left→right" },
  { label: "Linear LR", value: "horizontal", hint: "Left-to-right flow" },
  { label: "Top-Down", value: "vertical", hint: "Stacked top-to-bottom" },
  { label: "Hierarchical", value: "hierarchical", hint: "Custom layer assignment" },
];

const ICON_SIZES: { label: string; value: ArchStyle["iconSize"]; px: string }[] = [
  { label: "Small", value: "sm", px: "16px" },
  { label: "Medium", value: "md", px: "28px" },
  { label: "Large", value: "lg", px: "40px" },
];

const EDGE_STYLES: { label: string; value: ArchStyle["edgeStyle"] }[] = [
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
];

export function CustomizationPanel() {
  const style = useDiagramStore((s) => s.style);
  const setStyle = useDiagramStore((s) => s.setStyle);
  const graph = useDiagramStore((s) => s.graph);

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shapes className="h-4 w-4 text-teal-600" />
            Customization
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setStyle(DEFAULT_STYLE)}
            title="Reset to defaults"
          >
            <RotateCcw className="h-3 w-3 mr-1" />Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Tabs defaultValue="layout" className="w-full">
          <TabsList className="grid grid-cols-4 h-8 text-[11px] w-full">
            <TabsTrigger value="layout" className="gap-1"><Layout className="h-3 w-3" />Layout</TabsTrigger>
            <TabsTrigger value="colors" className="gap-1"><Palette className="h-3 w-3" />Colors</TabsTrigger>
            <TabsTrigger value="labels" className="gap-1"><Tag className="h-3 w-3" />Labels</TabsTrigger>
            <TabsTrigger value="edges" className="gap-1"><Shapes className="h-3 w-3" />Edges</TabsTrigger>
          </TabsList>

          {/* Layout tab */}
          <TabsContent value="layout" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Layout direction</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setStyle({ layout: l.value })}
                    className={`text-left px-2 py-1.5 rounded-md border text-[11px] transition ${
                      style.layout === l.value
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                        : "border-border hover:border-teal-400/40 hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium">{l.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{l.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Icon size</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {ICON_SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle({ iconSize: s.value })}
                    className={`px-2 py-1.5 rounded-md border text-[11px] transition ${
                      style.iconSize === s.value
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
                        : "border-border hover:border-teal-400/40 hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground">{s.px}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                {style.theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                <div>
                  <div className="text-[12px] font-medium">Theme</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{style.theme}</div>
                </div>
              </div>
              <Switch
                checked={style.theme === "dark"}
                onCheckedChange={(v) => setStyle({ theme: v ? "dark" : "light" })}
              />
            </div>
          </TabsContent>

          {/* Colors tab */}
          <TabsContent value="colors" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Color scheme</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {PALETTE.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setStyle({ colorMode: p.value })}
                    className={`px-2 py-1.5 rounded-md border text-[11px] transition ${
                      style.colorMode === p.value
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
                        : "border-border hover:border-teal-400/40 hover:bg-accent"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {style.colorMode === "type" && "Each node tinted by its service type (compute, database, etc.)"}
                {style.colorMode === "brand" && "Each node uses its provider's official brand color"}
                {style.colorMode === "custom" && "Set per-node colors from the node detail panel"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Background accent</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {["#0b1220", "#ffffff", "#fafaf9", "#fef3c7", "#dbeafe", "#dcfce7"].map((c) => (
                  <button
                    key={c}
                    onClick={() => {/* placeholder — no backend yet */}}
                    className="h-6 w-6 rounded border border-border hover:ring-2 hover:ring-teal-400"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Labels tab */}
          <TabsContent value="labels" className="mt-3 space-y-3">
            <ToggleRow
              label="Show node labels"
              hint="Service name beneath each node"
              checked={style.showLabels}
              onChange={(v) => setStyle({ showLabels: v })}
            />
            <ToggleRow
              label="Show edge labels"
              hint="Protocol/relationship name on edges"
              checked={style.showEdgeLabels}
              onChange={(v) => setStyle({ showEdgeLabels: v })}
            />
            <div className="rounded-md border border-border p-2 text-[10px] text-muted-foreground">
              Tip: click a node to set a custom label per node.
            </div>
          </TabsContent>

          {/* Edges tab */}
          <TabsContent value="edges" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Default edge style</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {EDGE_STYLES.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setStyle({ edgeStyle: e.value })}
                    className={`px-2 py-1.5 rounded-md border text-[11px] transition ${
                      style.edgeStyle === e.value
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
                        : "border-border hover:border-teal-400/40 hover:bg-accent"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Edge color legend</Label>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {[
                  ["HTTP/HTTPS", "#3b82f6"],
                  ["Database", "#22c55e"],
                  ["Redis", "#f97316"],
                  ["Event", "#f59e0b"],
                  ["gRPC", "#a855f7"],
                  ["Direct", "#ef4444"],
                ].map(([n, c]) => (
                  <div key={n} className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: c as string }} />
                    {n}
                  </div>
                ))}
              </div>
            </div>
            {graph && graph.nodes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[11px]"
                onClick={() => useDiagramStore.getState().rerender()}
              >
                <RotateCcw className="h-3 w-3 mr-1" />Re-render
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-2">
      <div>
        <div className="text-[12px] font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
