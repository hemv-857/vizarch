// POST /api/v1/batch — Generate multiple diagrams in parallel.
// Body: { "diagrams": [{ "description": "...", "format": "svg" }, ...] }
// Returns: array of results (svg + metadata for each)

import { NextRequest, NextResponse } from "next/server";
import { batchGenerate, type GenerateRequest } from "@/lib/vizarch/diagram-service";
import { checkRateLimit, pruneOldBuckets } from "@/lib/vizarch/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const BatchSchema = z.object({
  diagrams: z
    .array(
      z.object({
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
          })
          .optional(),
        useCache: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(20), // max 20 diagrams per batch request
});

export async function POST(req: NextRequest) {
  // Rate limit: batch counts as 1 request but consumes the diagrams array
  pruneOldBuckets();
  const rateLimit = checkRateLimit(req, "batch", "free");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", limit: rateLimit.limit, resetAt: rateLimit.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const requests = parsed.data.diagrams as GenerateRequest[];
  const { results, totalMs } = await batchGenerate(requests);

  return NextResponse.json({
    ok: true,
    count: results.length,
    totalMs,
    results: results.map((r, i) => {
      if ("error" in r) {
        return { index: i, ok: false, error: r.error };
      }
      return {
        index: i,
        ok: true,
        svg: r.svg,
        width: r.width,
        height: r.height,
        graph: r.graph,
        meta: r.meta,
      };
    }),
  });
}
