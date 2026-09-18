// vizarch — Unit tests for layout engine
// Run: bun test tests/layout-engine.test.ts

import { describe, it, expect } from "bun:test";
import { layoutGraph, DEFAULT_LAYOUT_OPTIONS } from "../src/lib/vizarch/layout-engine";
import type { ArchGraph } from "../src/lib/vizarch/types";

function makeGraph(nodes: { id: string; label?: string }[], edges: { from: string; to: string }[]): ArchGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label ?? n.id,
      serviceId: "generic.microservice",
      serviceName: "Test",
      provider: "generic" as const,
      type: "compute" as const,
      iconPath: "",
      description: "",
      x: 0,
      y: 0,
    })),
    edges: edges.map((e, i) => ({
      id: `e${i}`,
      from: e.from,
      to: e.to,
      protocol: "direct",
    })),
  };
}

describe("layoutGraph", () => {
  it("lays out a linear chain (A→B→C)", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [{ from: "a", to: "b" }, { from: "b", to: "c" }],
    );
    const { width, height } = layoutGraph(graph, { orientation: "horizontal" });
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    // A should be leftmost, C rightmost
    const a = graph.nodes.find((n) => n.id === "a")!;
    const c = graph.nodes.find((n) => n.id === "c")!;
    expect(a.x).toBeLessThan(c.x);
  });

  it("lays out a diamond (A→B, A→C, B→D, C→D)", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "d" },
        { from: "c", to: "d" },
      ],
    );
    const { width, height } = layoutGraph(graph, { orientation: "horizontal" });
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    // All nodes should have distinct positions
    const positions = graph.nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(4);
  });

  it("handles disconnected nodes", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [], // no edges
    );
    const { width, height } = layoutGraph(graph, { orientation: "horizontal" });
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    // All nodes should be placed
    for (const n of graph.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles single node", () => {
    const graph = makeGraph([{ id: "a" }], []);
    const { width, height } = layoutGraph(graph, { orientation: "horizontal" });
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it("handles cycle (A→B→C→A)", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "a" },
      ],
    );
    // Should not infinite loop
    const { width, height } = layoutGraph(graph, { orientation: "horizontal" });
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it("vertical orientation produces taller layout", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [{ from: "a", to: "b" }, { from: "b", to: "c" }],
    );
    const h = layoutGraph(graph, { orientation: "horizontal" });
    const v = layoutGraph(graph, { orientation: "vertical" });
    // Vertical should be taller than horizontal
    expect(v.height).toBeGreaterThanOrEqual(h.height);
  });

  it("respects manual layer assignment", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [{ from: "a", to: "c" }],
    );
    layoutGraph(graph, {
      orientation: "horizontal",
      layerAssignment: { b: 2 }, // force b to layer 2
    });
    const b = graph.nodes.find((n) => n.id === "b")!;
    // b should be in a higher layer (further right)
    expect(b.x).toBeGreaterThan(0);
  });

  it("returns positive dimensions for empty graph", () => {
    const graph = makeGraph([], []);
    const { width, height } = layoutGraph(graph, { orientation: "horizontal" });
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });
});
