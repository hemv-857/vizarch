// GET /api/diagrams/[slug]/versions/[version] — Get a specific version's full graph

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; version: string }> },
) {
  const { slug, version } = await ctx.params;
  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum)) {
    return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
  }

  const diagram = await db.diagram.findUnique({ where: { slug } });
  if (!diagram) {
    return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  }

  const ver = await db.diagramVersion.findFirst({
    where: { diagramId: diagram.id, version: versionNum },
  });
  if (!ver) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    version: {
      id: ver.id,
      version: ver.version,
      graphJson: ver.graphJson,
      styleJson: ver.styleJson,
      svgCache: ver.svgCache,
      changeSummary: ver.changeSummary,
      createdAt: ver.createdAt,
    },
  });
}
