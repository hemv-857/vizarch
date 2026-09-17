// POST /api/diagrams      — Save a diagram and return share slug
// GET  /api/diagrams      — List recently saved diagrams

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const CreateSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(8000),
  graphJson: z.string().max(200_000),
  styleJson: z.string().max(50_000).optional(),
  svgCache: z.string().max(500_000).optional(),
});

function genSlug(): string {
  // 8-char random base36
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
}

export async function POST(req: NextRequest) {
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
  // Ensure unique slug
  let slug = genSlug();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.diagram.findUnique({ where: { slug } }).catch(() => null);
    if (!existing) break;
    slug = genSlug();
    attempts++;
  }

  const diagram = await db.diagram.create({
    data: {
      slug,
      title: parsed.data.title ?? null,
      description: parsed.data.description,
      graphJson: parsed.data.graphJson,
      styleJson: parsed.data.styleJson ?? null,
      svgCache: parsed.data.svgCache ?? null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
    },
  });

  // Create version 1 (initial snapshot)
  await db.diagramVersion.create({
    data: {
      diagramId: diagram.id,
      version: 1,
      graphJson: parsed.data.graphJson,
      styleJson: parsed.data.styleJson ?? null,
      svgCache: parsed.data.svgCache ?? null,
      changeSummary: "Initial version",
    },
  }).catch(() => {
    // version creation is best-effort
  });

  return NextResponse.json({ ok: true, diagram }, { status: 201 });
}

export async function GET() {
  const diagrams = await db.diagram.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      viewCount: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ total: diagrams.length, diagrams });
}
