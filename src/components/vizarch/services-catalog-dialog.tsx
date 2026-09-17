"use client";

import { useMemo, useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink } from "lucide-react";
import { SERVICES, getProviderLabel, getTypeLabel } from "@/lib/vizarch/services";
import type { ServiceProvider, ServiceType } from "@/lib/vizarch/services";

const PROVIDERS: (ServiceProvider | "all")[] = ["all", "aws", "gcp", "azure", "kubernetes", "generic"];
const TYPES: (ServiceType | "all")[] = [
  "all", "compute", "container", "database", "cache", "storage",
  "cdn", "networking", "messaging", "queue", "analytics",
  "monitoring", "security", "ai", "frontend", "external", "client",
];

export function ServicesCatalogDialog() {
  const open = useDiagramStore((s) => s.showServicesCatalog);
  const setOpen = useDiagramStore((s) => s.toggleServicesCatalog);

  return (
    <Dialog open={open} onOpenChange={() => setOpen()}>
      <DialogContent className="max-w-4xl w-[94vw] h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            Service catalog
            <Badge variant="secondary" className="text-[10px]">{SERVICES.length} icons</Badge>
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Browse the full icon & metadata library. AWS · GCP · Azure · Kubernetes · Generic
          </DialogDescription>
        </DialogHeader>
        {open && <CatalogBody />}
      </DialogContent>
    </Dialog>
  );
}

function CatalogBody() {
  const [q, setQ] = useState("");
  const [prov, setProv] = useState<ServiceProvider | "all">("all");
  const [type, setType] = useState<ServiceType | "all">("all");

  const filtered = useMemo(() => {
    const p = q.toLowerCase().trim();
    return SERVICES.filter((s) => {
      if (prov !== "all" && s.provider !== prov) return false;
      if (type !== "all" && s.type !== type) return false;
      if (!p) return true;
      const hay = (s.name + " " + s.aliases.join(" ") + " " + s.description).toLowerCase();
      return hay.includes(p);
    });
  }, [q, prov, type]);

  const counts = useMemo(() => {
    const map = new Map<ServiceProvider, number>();
    for (const s of SERVICES) map.set(s.provider, (map.get(s.provider) ?? 0) + 1);
    return map;
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services (Lambda, RDS, Ingress, Postgres…)"
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => setProv(p)}
              className={`px-2 py-0.5 rounded text-[10px] border transition ${
                prov === p
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                  : "border-border hover:bg-accent"
              }`}
            >
              {p === "all"
                ? `All (${SERVICES.length})`
                : `${getProviderLabel(p)} (${counts.get(p as ServiceProvider) ?? 0})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-1.5 py-0.5 rounded text-[10px] border transition ${
                type === t
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                  : "border-border hover:bg-accent"
              }`}
            >
              {t === "all" ? "All types" : getTypeLabel(t as ServiceType)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-md border border-border bg-card p-2 hover:border-teal-400/60 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded shrink-0"
                  style={{ background: (s.brandColor ?? "#3b82f6") + "22" }}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke={s.brandColor ?? "#3b82f6"} strokeWidth={1.6}>
                    <path d={s.iconPath} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate">{s.name}</div>
                  <div className="text-[9px] text-muted-foreground truncate">{s.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-1">
                <Badge variant="outline" className="text-[9px] h-3.5 px-1">{getProviderLabel(s.provider)}</Badge>
                <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{getTypeLabel(s.type)}</Badge>
              </div>
              <div className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                {s.description}
              </div>
              {s.docLink && (
                <a
                  href={s.docLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[9px] text-teal-600 hover:underline mt-1"
                >
                  <ExternalLink className="h-2 w-2" />docs
                </a>
              )}
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No services match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
