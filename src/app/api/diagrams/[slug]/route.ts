// GET /api/diagrams/[slug] — Retrieve a saved diagram by share slug
// DELETE /api/diagrams/[slug] — Delete a saved diagram

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
  await db.diagram
    .update({ where: { id: diagram.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});
  return NextResponse.json({ ok: true, diagram });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const existing = await db.diagram.findUnique({ where: { slug } });
  if (!existing) {
    return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  }
  await db.diagram.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
