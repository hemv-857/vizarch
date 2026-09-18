// vizarch — Architecture parser
// Parses a plain English architecture description into a structured ArchGraph.
//
// Strategy:
//   1. Try Claude (z-ai-web-dev-sdk) chat completion to extract JSON graph.
//   2. If Claude call fails or returns invalid JSON, fall back to a rule-based
//      template parser using the services alias index.
//
// Both paths produce an ArchGraph (no layout applied yet).

import ZAI from "z-ai-web-dev-sdk";
import {
  resolveServiceByName,
  SERVICES,
  type ServiceMeta,
} from "./services";
import { buildGraphFromServices, type ArchGraph } from "./types";

export interface ParseResult {
  graph: ArchGraph;
  confidence: number;           // 0..1
  ambiguities: string[];        // unresolved component mentions
  usedFallback: boolean;
  parseTimeMs: number;
  rawSuggestions?: string[];
}

const SYSTEM_PROMPT = `You are an expert cloud architect assistant that converts plain-English system architecture descriptions into a structured JSON graph for diagram rendering.

Output STRICTLY a single JSON object (no prose, no markdown fences) with the following shape:

{
  "nodes": [
    { "id": "n1", "service": "aws.lambda", "label": "Order Lambda" }
  ],
  "edges": [
    { "from": "n1", "to": "n2", "protocol": "https", "label": "Invoke" }
  ],
  "ambiguities": [
    "Could not determine if 'storage' refers to S3 or EFS"
  ]
}

Rules:
1. The "service" field MUST be one of the canonical IDs from this catalog. Only use IDs that appear in the catalog:
${SERVICES.map((s) => `- ${s.id} (${s.name}; aliases: ${s.aliases.slice(0, 4).join(", ")})`).join("\n")}

2. Each node "id" must be unique, short (e.g. n1, n2, n3...).
3. Each edge must reference an existing node id. "protocol" should be one of: https, http, grpc, postgres, mysql, redis, db, event, sqs, sns, amqp, mqtt, websocket, tcp, udp, direct. Use "direct" when no specific protocol applies.
4. Only include nodes/edges that the user actually described. Do NOT invent extra services.
5. If the user mentions a service that does not match any catalog entry, add it as a node with "service": "generic.microservice" and add the ambiguous term to "ambiguities".
6. Use exactly the JSON shape above. No trailing text.

CRITICAL NODE-EXTRACTION RULES (do NOT skip nodes!):
7. Treat EVERY noun phrase that names a service, platform, or technology as a SEPARATE node. Do NOT merge phrases like "React frontend on Vercel" into one node — instead create TWO nodes: one for the frontend ("generic.frontend", label "React frontend") and one for the hosting ("generic.vercel", label "Vercel"), then connect them with an edge (protocol "https", label "Hosted on").
8. Prepositions like "on", "via", "with", "using", "behind" typically indicate TWO services connected by an edge. "X on Y" → node X + node Y + edge(X → Y). "X via Y" → node X + node Y + edge(X → Y, label "via").
9. Common "X on Y" patterns to split:
   - "React frontend on Vercel" → frontend node + Vercel node
   - "API on Lambda" → API node + Lambda node
   - "database on RDS" → database node + RDS node (or just RDS node if database type is ambiguous)
   - "cache on ElastiCache" → cache node + ElastiCache node
   - "storage on S3" → S3 node (S3 IS the storage, so one node is fine here)
10. Verbs and action words imply edges: "queries", "calls", "publishes to", "writes to", "reads from", "notifies", "monitors", "caches", "routes to" all indicate directional edges from the subject to the object.
11. When in doubt about whether something is a service or just a descriptor, err on the side of creating a node. It's easier to delete an extra node than to recover a missing one.`;

function extractJsonBlock(text: string): string {
  // Try fenced ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  // Try to find the first { ... } block
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1).trim();
  }
  return text.trim();
}

interface LlmGraph {
  nodes: { id: string; service?: string; label?: string }[];
  edges: {
    from: string;
    to: string;
    protocol?: string;
    label?: string;
  }[];
  ambiguities?: string[];
}

function validateLlmGraph(obj: unknown): obj is LlmGraph {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.nodes) || !Array.isArray(o.edges)) return false;
  return true;
}

async function parseWithLlm(description: string): Promise<{
  graph: LlmGraph | null;
  raw: string;
}> {
  let zai: Awaited<ReturnType<typeof ZAI.create>>;
  try {
    zai = await ZAI.create();
  } catch (err) {
    throw new Error(`ZAI init failed: ${(err as Error).message}`);
  }

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: SYSTEM_PROMPT },
      { role: "user", content: description },
    ],
    thinking: { type: "disabled" },
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";
  const jsonText = extractJsonBlock(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { graph: null, raw };
  }
  if (!validateLlmGraph(parsed)) {
    return { graph: null, raw };
  }
  return { graph: parsed, raw };
}

// --- Rule-based fallback parser ---------------------------------------

// Split text into component-ish phrases. Heuristic: split on commas, newlines,
// " and ", " with ", " + ", and arrow tokens (" -> ", " → ").
function splitPhrases(text: string): string[] {
  return text
    .replace(/->|→|=>/g, "→")
    .split(/,|\n|;|\bAND\b|\bWITH\b|\+|→|\bTHEN\b/gi)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveAllFromPhrase(phrase: string): ServiceMeta[] {
  const out: ServiceMeta[] = [];
  const seen = new Set<string>();
  // Try whole phrase first
  const whole = resolveServiceByName(phrase);
  if (whole && !seen.has(whole.id)) {
    seen.add(whole.id);
    out.push(whole);
    return out;
  }
  // Otherwise token-scan for known service aliases inside the phrase.
  const tokens = phrase.split(/\s+|\(|\)|\[|\]|\//).map((t) => t.trim()).filter(Boolean);
  // Sort tokens longest-first so longer matches win
  tokens.sort((a, b) => b.length - a.length);
  for (const tok of tokens) {
    const m = resolveServiceByName(tok);
    if (m && !seen.has(m.id)) {
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
}

function parseWithRules(description: string): {
  graph: LlmGraph;
  ambiguities: string[];
} {
  const phrases = splitPhrases(description);
  const nodeById = new Map<string, { id: string; service: ServiceMeta; label: string }>();
  const ambiguities: string[] = [];

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const matches = resolveAllFromPhrase(phrase);
    if (matches.length === 0) {
      // Could not resolve any service from this phrase. If the phrase has 2+ words,
      // treat it as a custom microservice so the user still sees something.
      if (phrase.split(/\s+/).length >= 2) {
        const id = `n${nodeById.size + 1}`;
        const generic = SERVICES.find((s) => s.id === "generic.microservice")!;
        nodeById.set(id, {
          id,
          service: generic,
          label: phrase.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 32),
        });
        ambiguities.push(`Unknown service: "${phrase}" (added as generic microservice)`);
      }
      continue;
    }
    for (const m of matches) {
      // Use service name as dedup key (so mentioning "Lambda" twice produces one node)
      const existing = Array.from(nodeById.values()).find((n) => n.service.id === m.id);
      if (existing) continue;
      const id = `n${nodeById.size + 1}`;
      nodeById.set(id, { id, service: m, label: m.name });
    }
  }

  // Auto-link: connect each non-source node to the most likely upstream node.
  // Heuristic: link services in type-priority order:
  //   frontend/cdn/networking -> compute -> database/cache/storage/messaging
  const typeOrder: Record<string, number> = {
    frontend: 0, client: 0, cdn: 1, networking: 2, security: 3, compute: 4,
    container: 4, analytics: 5, ai: 5, queue: 6, messaging: 6, database: 7,
    cache: 7, storage: 8, monitoring: 9, external: 10,
  };
  const nodes = Array.from(nodeById.values());
  nodes.sort((a, b) => (typeOrder[a.service.type] ?? 99) - (typeOrder[b.service.type] ?? 99));

  const edges: LlmGraph["edges"] = [];
  // Connect adjacent nodes in priority order (so frontend -> compute -> db chain emerges)
  for (let i = 1; i < nodes.length; i++) {
    const from = nodes[i - 1];
    const to = nodes[i];
    // Skip self-loops / duplicates
    if (from.id === to.id) continue;
    // Skip monitoring/external back-edges
    if (to.service.type === "monitoring" || to.service.type === "external") {
      // attach monitoring to the last compute-ish node instead
      const target = nodes[i - 1];
      edges.push({
        from: target.id,
        to: to.id,
        protocol: "direct",
        label: "monitoring",
      });
      continue;
    }
    let protocol = "direct";
    if (to.service.type === "database") protocol = "postgres";
    else if (to.service.type === "cache") protocol = "redis";
    else if (to.service.type === "storage") protocol = "https";
    else if (to.service.type === "messaging" || to.service.type === "queue") protocol = "event";
    else if (to.service.type === "cdn" || to.service.type === "networking") protocol = "https";
    else if (to.service.type === "compute" || to.service.type === "container") protocol = "https";
    edges.push({ from: from.id, to: to.id, protocol });
  }

  // Also: explicitly attach monitoring nodes to nearest compute node
  const monitors = nodes.filter((n) => n.service.type === "monitoring");
  const computes = nodes.filter((n) =>
    ["compute", "container", "frontend"].includes(n.service.type),
  );
  for (const mon of monitors) {
    if (computes.length === 0) continue;
    const target = computes[computes.length - 1];
    if (!edges.find((e) => e.to === mon.id)) {
      edges.push({ from: target.id, to: mon.id, protocol: "direct", label: "metrics" });
    }
  }

  return {
    graph: {
      nodes: nodes.map((n) => ({
        id: n.id,
        service: n.service.id,
        label: n.label,
      })),
      edges,
      ambiguities,
    },
    ambiguities,
  };
}

// --- Public entry point ------------------------------------------------

function materializeGraph(llm: LlmGraph): { graph: ArchGraph; ambiguities: string[] } {
  const services: { id: string; service: ServiceMeta; label?: string }[] = [];
  const ambiguities: string[] = [];

  for (const n of llm.nodes) {
    const meta = SERVICES.find((s) => s.id === n.service);
    if (!meta) {
      // Unknown service id — use generic microservice
      const fallback = SERVICES.find((s) => s.id === "generic.microservice")!;
      services.push({ id: n.id, service: fallback, label: n.label ?? "Service" });
      ambiguities.push(`Unmapped service "${n.service}" → used generic.microservice`);
      continue;
    }
    services.push({ id: n.id, service: meta, label: n.label ?? meta.name });
  }

  const edges = llm.edges
    .filter((e) => services.some((s) => s.id === e.from) && services.some((s) => s.id === e.to))
    .map((e) => ({
      from: e.from,
      to: e.to,
      protocol: e.protocol ?? "direct",
      label: e.label,
    }));

  return { graph: buildGraphFromServices(services, edges), ambiguities };
}

export async function parseArchitecture(description: string): Promise<ParseResult> {
  const start = Date.now();
  const trimmed = description.trim();
  if (!trimmed) {
    return {
      graph: { nodes: [], edges: [], style: undefined },
      confidence: 0,
      ambiguities: ["Empty description"],
      usedFallback: true,
      parseTimeMs: Date.now() - start,
    };
  }

  // Try LLM first
  try {
    const { graph: llmGraph, raw } = await parseWithLlm(trimmed);
    if (llmGraph) {
      const { graph, ambiguities } = materializeGraph(llmGraph);
      const confidence = Math.max(
        0.5,
        Math.min(
          0.99,
          1 - ambiguities.length * 0.1 - (graph.nodes.length === 0 ? 0.5 : 0),
        ),
      );
      return {
        graph,
        confidence,
        ambiguities,
        usedFallback: false,
        parseTimeMs: Date.now() - start,
        rawSuggestions: [raw.slice(0, 200)],
      };
    }
  } catch (err) {
    // fall through to rule-based parser
    console.warn("[vizarch] LLM parse failed, using fallback:", (err as Error).message);
  }

  // Fallback: rule-based parser
  const { graph: llmGraph, ambiguities } = parseWithRules(trimmed);
  const { graph } = materializeGraph(llmGraph);
  const confidence = Math.max(0.3, 0.85 - ambiguities.length * 0.1);
  return {
    graph,
    confidence,
    ambiguities,
    usedFallback: true,
    parseTimeMs: Date.now() - start,
  };
}
