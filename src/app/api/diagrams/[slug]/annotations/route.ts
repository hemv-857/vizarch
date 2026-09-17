// GET  /api/diagrams/[slug]/annotations — List annotations for a diagram
// POST /api/diagrams/[slug]/annotations — Add an annotation to a node
// Query: ?nodeId=n1 to filter by node

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const CreateSchema = z.object({
  nodeId: z.string().min(1).max(100),
  author: z.string().max(100).default("Anonymous"),
  text: z.string().min(1).max(1000),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const nodeId = req.nextUrl.searchParams.get("nodeId");
  const where: { diagramSlug: string; nodeId?: string } = { diagramSlug: slug };
  if (nodeId) where.nodeId = nodeId;

  const annotations = await db.nodeAnnotation.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nodeId: true,
      author: true,
      text: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ total: annotations.length, annotations });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify diagram exists
  const diagram = await db.diagram.findUnique({ where: { slug } });
  if (!diagram) {
    return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  }

  const annotation = await db.nodeAnnotation.create({
    data: {
      diagramSlug: slug,
      nodeId: parsed.data.nodeId,
      author: parsed.data.author,
      text: parsed.data.text,
    },
    select: {
      id: true,
      nodeId: true,
      author: true,
      text: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, annotation }, { status: 201 });
}
