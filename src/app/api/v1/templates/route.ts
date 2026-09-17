// GET /api/v1/templates — Returns preset architectures for quick-start.

import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/vizarch/diagram-service";

export const runtime = "nodejs";

export async function GET() {
  const templates = listTemplates();
  return NextResponse.json({
    total: templates.length,
    templates,
  });
}
