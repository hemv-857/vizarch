// POST /api/v1/warmup — Trigger cache pre-warming (all templates × themes × layouts)
// GET  /api/v1/warmup — Check warmup status

import { NextResponse } from "next/server";
import { warmupCache, isWarmedUp } from "@/lib/vizarch/diagram-service";

export const runtime = "nodejs";

export async function POST() {
  if (isWarmedUp()) {
    return NextResponse.json({ ok: true, alreadyWarmed: true });
  }
  // Fire and forget — don't block the response
  warmupCache().catch((err) => {
    console.error("[vizarch] warmup error:", err);
  });
  return NextResponse.json({
    ok: true,
    message: "Cache warming started in background. Templates will be cached within a few seconds.",
  });
}

export async function GET() {
  return NextResponse.json({
    warmed: isWarmedUp(),
  });
}
