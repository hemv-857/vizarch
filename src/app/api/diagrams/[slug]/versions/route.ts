// GET  /api/diagrams/[slug]/versions — List all versions of a diagram
// POST /api/diagrams/[slug]/versions — Save a new version (snapshot current state)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const diagram = await db.diagram.findUnique({ where: { slug } });
  if (!diagram) {
    return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  }
  const versions = await db.diagramVersion.findMany({
    where: { diagramId: diagram.id },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      changeSummary: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ total: versions.length, versions });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const diagram = await db.diagram.findUnique({ where: { slug } });
  if (!diagram) {
    return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  }

  // Get the latest version number
  const latest = await db.diagramVersion.findFirst({
    where: { diagramId: diagram.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const version = await db.diagramVersion.create({
    data: {
      diagramId: diagram.id,
      version: nextVersion,
      graphJson: body.graphJson ?? diagram.graphJson,
      styleJson: body.styleJson ?? diagram.styleJson,
      svgCache: body.svgCache ?? diagram.svgCache,
      changeSummary: body.changeSummary ?? null,
    },
    select: {
      id: true,
      version: true,
      changeSummary: true,
      createdAt: true,
    },
  });

  // Also update the diagram's current state
  if (body.graphJson) {
    await db.diagram.update({
      where: { id: diagram.id },
      data: {
        graphJson: body.graphJson,
        styleJson: body.styleJson,
        svgCache: body.svgCache,
      },
    });
  }

  return NextResponse.json({ ok: true, version }, { status: 201 });
}
