import { NextRequest } from "next/server";
import { generateDiagram, type GenerateRequest } from "@/lib/vizarch/diagram-service";
import { checkRateLimit, pruneOldBuckets } from "@/lib/vizarch/rate-limit";
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
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  pruneOldBuckets();
  const rateLimit = checkRateLimit(req, "generate", "free");
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!parsed.data.description && !parsed.data.templateId) {
    return new Response(JSON.stringify({ error: "Either description or templateId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send("start", { message: "Generating diagram...", timestamp: Date.now() });
        send("progress", { step: "parse", message: "Parsing architecture description..." });

        const result = await generateDiagram(parsed.data as GenerateRequest);

        send("progress", { step: "layout", message: "Computing layout..." });
        send("progress", { step: "render", message: "Rendering SVG..." });

        send("done", {
          svg: result.svg,
          width: result.width,
          height: result.height,
          graph: result.graph,
          meta: result.meta,
        });

        controller.close();
      } catch (err) {
        send("error", { message: (err as Error).message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-RateLimit-Limit": String(rateLimit.limit),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
    },
  });
}
