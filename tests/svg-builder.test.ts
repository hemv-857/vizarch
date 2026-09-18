// vizarch — Unit tests for SVG builder
// Run: bun test tests/svg-builder.test.ts

import { describe, it, expect } from "bun:test";
import { buildSvg, clearSvgCache } from "../src/lib/vizarch/svg-builder";
import type { ArchGraph } from "../src/lib/vizarch/types";

function makeGraph(nodeCount = 2, edgeCount = 1): ArchGraph {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    label: `Node ${i}`,
    serviceId: "generic.microservice",
    serviceName: "Test",
    provider: "generic" as const,
    type: "compute" as const,
    iconPath: "M0 0h10v10H0z",
    description: "",
    x: i * 200,
    y: 0,
  }));
  const edges = Array.from({ length: Math.min(edgeCount, nodeCount - 1) }, (_, i) => ({
    id: `e${i}`,
    from: `n${i}`,
    to: `n${i + 1}`,
    protocol: "https",
    label: "test",
  }));
  return { nodes, edges };
}

describe("buildSvg", () => {
  it("produces valid SVG string", () => {
    clearSvgCache();
    const graph = makeGraph(3, 2);
    const { svg, width, height } = buildSvg(graph);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it("renders all nodes", () => {
    clearSvgCache();
    const graph = makeGraph(5, 4);
    const { svg } = buildSvg(graph);
    for (let i = 0; i < 5; i++) {
      expect(svg).toContain(`data-id="n${i}"`);
    }
  });

  it("renders all edges", () => {
    clearSvgCache();
    const graph = makeGraph(4, 3);
    const { svg } = buildSvg(graph);
    for (let i = 0; i < 3; i++) {
      expect(svg).toContain(`data-id="e${i}"`);
    }
  });

  it("applies dark theme", () => {
    clearSvgCache();
    const graph = makeGraph(2, 1);
    const { svg } = buildSvg(graph, { theme: "dark" });
    expect(svg).toContain("#0b1220"); // dark background
  });

  it("applies light theme", () => {
    clearSvgCache();
    const graph = makeGraph(2, 1);
    const { svg } = buildSvg(graph, { theme: "light" });
    expect(svg).toContain("#ffffff"); // light background
  });

  it("shows node labels when enabled", () => {
    clearSvgCache();
    const graph = makeGraph(1, 0);
    graph.nodes[0].label = "MyLabel";
    const { svg } = buildSvg(graph, { showNodeLabels: true });
    expect(svg).toContain("MyLabel");
  });

  it("hides node labels when disabled", () => {
    clearSvgCache();
    const graph = makeGraph(1, 0);
    graph.nodes[0].label = "HiddenLabel";
    const { svg } = buildSvg(graph, { showNodeLabels: false });
    expect(svg).not.toContain("HiddenLabel");
  });

  it("shows edge labels when enabled", () => {
    clearSvgCache();
    const graph = makeGraph(2, 1);
    graph.edges[0].label = "HTTPS";
    const { svg } = buildSvg(graph, { showEdgeLabels: true });
    expect(svg).toContain("HTTPS");
  });

  it("hides edge labels when disabled", () => {
    clearSvgCache();
    const graph = makeGraph(2, 1);
    graph.edges[0].label = "HiddenEdge";
    const { svg } = buildSvg(graph, { showEdgeLabels: false });
    expect(svg).not.toContain("HiddenEdge");
  });

  it("highlights selected node", () => {
    clearSvgCache();
    const graph = makeGraph(3, 2);
    const { svg } = buildSvg(graph, { selectedNodeId: "n1" });
    expect(svg).toContain('class="node selected"');
  });

  it("highlights selected edge", () => {
    clearSvgCache();
    const graph = makeGraph(3, 2);
    const { svg } = buildSvg(graph, { selectedEdgeId: "e0" });
    expect(svg).toContain('class="edge selected"');
  });

  it("sanitizes malicious node labels", () => {
    clearSvgCache();
    const graph = makeGraph(1, 0);
    graph.nodes[0].label = '<script>alert("xss")</script>';
    const { svg } = buildSvg(graph);
    // Script tags should be stripped, leaving only the text content
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("</script>");
    // The text "alert" alone is harmless — it's the <script> tag that's dangerous
  });

  it("sanitizes malicious edge labels", () => {
    clearSvgCache();
    const graph = makeGraph(2, 1);
    graph.edges[0].label = '<img src=x onerror=alert(1)>';
    const { svg } = buildSvg(graph, { showEdgeLabels: true });
    expect(svg).not.toContain("<img");
    expect(svg).not.toContain("onerror");
  });

  it("caches identical renders", () => {
    clearSvgCache();
    const graph = makeGraph(2, 1);
    const r1 = buildSvg(graph);
    const r2 = buildSvg(graph);
    expect(r1.svg).toBe(r2.svg);
  });

  it("handles empty graph", () => {
    clearSvgCache();
    const graph = makeGraph(0, 0);
    const { svg, width, height } = buildSvg(graph);
    expect(svg).toContain("<svg");
    expect(width).toBeGreaterThanOrEqual(640);
    expect(height).toBeGreaterThanOrEqual(360);
  });
});
