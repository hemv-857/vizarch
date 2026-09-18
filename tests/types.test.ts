// vizarch — Unit tests for types (buildGraphFromServices)
// Run: bun test tests/types.test.ts

import { describe, it, expect } from "bun:test";
import { buildGraphFromServices, DEFAULT_STYLE } from "../src/lib/vizarch/types";
import type { ServiceMeta } from "../src/lib/vizarch/services";

const fakeService: ServiceMeta = {
  id: "generic.microservice",
  name: "Microservice",
  provider: "generic",
  type: "compute",
  aliases: ["ms", "service"],
  iconPath: "M0 0h10v10H0z",
  description: "A microservice",
};

describe("buildGraphFromServices", () => {
  it("creates nodes from services", () => {
    const graph = buildGraphFromServices(
      [
        { id: "n1", service: fakeService, label: "Service A" },
        { id: "n2", service: fakeService },
      ],
      [{ from: "n1", to: "n2", protocol: "https", label: "calls" }],
    );
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[0].label).toBe("Service A");
    expect(graph.nodes[1].label).toBe("Microservice"); // default to service name
  });

  it("creates edges with protocol", () => {
    const graph = buildGraphFromServices(
      [{ id: "n1", service: fakeService }, { id: "n2", service: fakeService }],
      [{ from: "n1", to: "n2", protocol: "postgres" }],
    );
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].protocol).toBe("postgres");
  });

  it("defaults protocol to 'direct'", () => {
    const graph = buildGraphFromServices(
      [{ id: "n1", service: fakeService }, { id: "n2", service: fakeService }],
      [{ from: "n1", to: "n2" }],
    );
    expect(graph.edges[0].protocol).toBe("direct");
  });

  it("sets default style", () => {
    const graph = buildGraphFromServices(
      [{ id: "n1", service: fakeService }],
      [],
    );
    expect(graph.style).toEqual(DEFAULT_STYLE);
  });

  it("handles empty inputs", () => {
    const graph = buildGraphFromServices([], []);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it("preserves service metadata on nodes", () => {
    const graph = buildGraphFromServices(
      [{ id: "n1", service: fakeService }],
      [],
    );
    const node = graph.nodes[0];
    expect(node.serviceId).toBe("generic.microservice");
    expect(node.serviceName).toBe("Microservice");
    expect(node.provider).toBe("generic");
    expect(node.type).toBe("compute");
    expect(node.iconPath).toBe("M0 0h10v10H0z");
    expect(node.description).toBe("A microservice");
  });
});
