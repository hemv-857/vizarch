// DELETE /api/diagrams/[slug]/annotations/[id] — Delete a specific annotation

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await ctx.params;
  try {
    await db.nodeAnnotation.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Annotation not found or already deleted" },
      { status: 404 },
    );
  }
}
