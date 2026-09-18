import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "vizarch",
    version: "0.2.1",
    endpoints: {
      generate: "POST /api/v1/generate",
      services: "GET /api/v1/services",
      templates: "GET /api/v1/templates",
      batch: "POST /api/v1/batch",
      warmup: "POST /api/v1/warmup",
      diagrams: "GET|POST /api/diagrams",
    },
  });
}