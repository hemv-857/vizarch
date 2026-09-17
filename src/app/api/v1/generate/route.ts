// POST /api/v1/generate — Generate a diagram from a description or template.
// GET  /api/v1/generate — Returns API usage info.

import { NextRequest, NextResponse } from "next/server";
import { generateDiagram, type GenerateRequest } from "@/lib/vizarch/diagram-service";
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
});

export async function POST(req: NextRequest) {
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
    const result = await generateDiagram(parsed.data as GenerateRequest);
    return NextResponse.json({
      ok: true,
      svg: result.svg,
      width: result.width,
      height: result.height,
      graph: result.graph,
      meta: result.meta,
    });
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
    limits: {
      free: "10 requests/day, 100/month",
      pro: "1,000 requests/month, 100/day",
    },
  });
}
