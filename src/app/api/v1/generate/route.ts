// POST /api/v1/generate — Generate a diagram from a description or template.
// GET  /api/v1/generate — Returns API usage info.

import { NextRequest, NextResponse } from "next/server";
import { generateDiagram, type GenerateRequest } from "@/lib/vizarch/diagram-service";
import { checkRateLimit, pruneOldBuckets, QUOTAS } from "@/lib/vizarch/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  description: z.string().max(4000).optional(),
  templateId: z.string().max(100).optional(),
  style: z
    .object({
      colorMode: z.enum(["type", "brand", "custom"]).optional(),
      layout: z.enum(["auto", "horizontal", "vertical", "hierarchical"]).optional(),
      iconSize: z.enum(["sm", "md", "lg"]).optional(),
      showLabels: z.boolean().optional(),
      showEdgeLabels: z.boolean().optional(),
      edgeStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
      theme: z.enum(["light", "dark"]).optional(),
      nodeColors: z.record(z.string(), z.string()).optional(),
      layerAssignment: z.record(z.string(), z.number()).optional(),
    })
    .optional(),
  useCache: z.boolean().optional(),
  sourceMap: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit check (free tier: 50 req/day by default)
  pruneOldBuckets();
  const rateLimit = checkRateLimit(req, "generate", "free");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `Free tier limit (${rateLimit.limit} requests/day) reached. Resets at ${new Date(rateLimit.resetAt).toISOString()}.`,
        tier: rateLimit.tier,
        limit: rateLimit.limit,
        resetAt: rateLimit.resetAt,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (!parsed.data.description && !parsed.data.templateId) {
    return NextResponse.json(
      { error: "Either `description` or `templateId` is required" },
      { status: 400 },
    );
  }
  try {
    const { sourceMap, ...generateReq } = parsed.data;
    const result = await generateDiagram(generateReq as GenerateRequest, sourceMap);
    return NextResponse.json(
      {
        ok: true,
        svg: result.svg,
        width: result.width,
        height: result.height,
        graph: result.graph,
        meta: result.meta,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Generation failed", message: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "vizarch",
    version: "v1",
    endpoints: {
      generate: "POST /api/v1/generate",
      services: "GET /api/v1/services",
      templates: "GET /api/v1/templates",
      export: "POST /api/v1/export",
    },
    limits: QUOTAS,
  });
}
