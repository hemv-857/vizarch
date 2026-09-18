// GET /api/v1/services — List available services for autocomplete & icons.
// Query: ?provider=aws|gcp|azure|kubernetes|generic  &type=compute|database|...
// Query: ?q=<prefix> for autocomplete lookup.

import { NextRequest, NextResponse } from "next/server";
import { listServices, servicesForAutocomplete, SERVICES } from "@/lib/vizarch/services";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const provider = sp.get("provider") as any;
  const type = sp.get("type") as any;
  const q = sp.get("q") ?? "";

  if (q) {
    const matches = servicesForAutocomplete(q, 25);
    return NextResponse.json({
      total: matches.length,
      services: matches.map((s) => ({
        id: s.id,
        name: s.name,
        provider: s.provider,
        type: s.type,
        aliases: s.aliases,
        description: s.description,
        brandColor: s.brandColor,
        docLink: s.docLink,
      })),
    });
  }

  const filter: any = {};
  if (provider) filter.provider = provider;
  if (type) filter.type = type;
  const list = listServices(Object.keys(filter).length ? filter : undefined);

  return NextResponse.json({
    total: list.length,
    catalogTotal: SERVICES.length,
    services: list.map((s) => ({
      id: s.id,
      name: s.name,
      provider: s.provider,
      type: s.type,
      aliases: s.aliases,
      description: s.description,
      brandColor: s.brandColor,
      docLink: s.docLink,
    })),
  });
}
