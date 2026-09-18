"use client";

import { useEffect, useRef, useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { TEMPLATES } from "@/lib/vizarch/templates";
import { servicesForAutocomplete } from "@/lib/vizarch/services";
import type { ServiceMeta } from "@/lib/vizarch/services";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Wand2,
  Loader2,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  GitBranch,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "React frontend on Vercel, Node.js API on Lambda, PostgreSQL on RDS, Redis cache, S3 storage, CloudFront CDN, SNS notifications, Datadog monitoring",
  "Next.js frontend, App Gateway, AKS cluster with 3 microservices (auth, orders, payments), Cosmos DB, Azure Service Bus, Azure Monitor",
  "Mobile app (React Native), API Gateway, EKS cluster, DynamoDB, ElastiCache, S3, SNS, CloudWatch",
];

const GITHUB_EXAMPLES = [
  "https://github.com/vercel/next.js",
  "https://github.com/facebook/react",
  "https://github.com/microsoft/vscode",
];

export function TextInputPanel() {
  const store = useDiagramStore();
  const description = useDiagramStore((s) => s.description);
  const status = useDiagramStore((s) => s.status);
  const meta = useDiagramStore((s) => s.meta);
  const graph = useDiagramStore((s) => s.graph);
  const setDescription = useDiagramStore((s) => s.setDescription);
  const setTemplate = useDiagramStore((s) => s.setTemplate);
  const applyGraph = useDiagramStore((s) => s.applyGraph);
  const setError = useDiagramStore((s) => s.setError);
  const setStyle = useDiagramStore((s) => s.setStyle);

  const [autoOpen, setAutoOpen] = useState(false);
  const [acItems, setAcItems] = useState<ServiceMeta[]>([]);
  const [taFocused, setTaFocused] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"describe" | "github">("describe");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;
  const charCount = description.length;

  useEffect(() => {
    if (graph && graph.nodes.length > 0 && meta) {
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  }, [graph?.nodes.length, meta]);

  useEffect(() => {
    if (!description) {
      setAcItems([]);
      setAutoOpen(false);
      return;
    }
    const tail = description.split(/[,;\n]/).pop() ?? "";
    const token = tail.trim().split(/\s+/).pop() ?? "";
    if (token.length < 2) {
      setAcItems([]);
      setAutoOpen(false);
      return;
    }
    const matches = servicesForAutocomplete(token, 8);
    setAcItems(matches);
    setAutoOpen(matches.length > 0);
  }, [description]);

  function insertService(meta: ServiceMeta) {
    const parts = description.split(/([,;\n])/);
    if (parts.length === 0) return;
    const lastPhraseIdx = parts.length - 1;
    const phrase = parts[lastPhraseIdx];
    const tokens = phrase.trim().split(/\s+/);
    tokens[tokens.length - 1] = meta.name;
    parts[lastPhraseIdx] = " " + tokens.join(" ");
    const next = parts.join("") + ", ";
    setDescription(next);
    setAutoOpen(false);
    requestAnimationFrame(() => taRef.current?.focus());
  }

  async function handleGenerate() {
    if (!description.trim()) {
      toast.error("Please describe your architecture first.");
      return;
    }
    setTemplate(null);
    useDiagramStore.setState({ status: "loading", error: null });

    try {
      // Try streaming first
      const res = await fetch("/api/v1/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          style: { layout: store.style.layout, theme: store.style.theme },
        }),
      });

      if (res.ok && res.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";
            for (const event of events) {
              const lines = event.split("\n");
              let eventType = "";
              let data = "";
              for (const line of lines) {
                if (line.startsWith("event: ")) eventType = line.slice(7);
                if (line.startsWith("data: ")) data = line.slice(6);
              }
              if (eventType === "done" && data) {
                const parsed = JSON.parse(data);
                applyGraph(parsed.graph, parsed.svg, parsed.width, parsed.height, parsed.meta);
                setStyle(parsed.graph.style ?? store.style);
                toast.success(
                  `Diagram generated · ${parsed.meta.nodeCount} nodes · ${parsed.meta.cacheHit ? "cached" : `${parsed.meta.parseTimeMs}ms`}`,
                );
              } else if (eventType === "error" && data) {
                const parsed = JSON.parse(data);
                throw new Error(parsed.message);
              }
            }
          }
          return;
        }
      }

      // Fallback to non-streaming
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      applyGraph(data.graph, data.svg, data.width, data.height, data.meta);
      setStyle(data.graph.style ?? store.style);
      toast.success(
        `Diagram generated · ${data.meta.nodeCount} nodes · ${data.meta.cacheHit ? "cached" : `${data.meta.parseTimeMs}ms`}`,
      );
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(`Generation failed: ${msg}`);
    }
  }

  async function handleTemplate(id: string) {
    setTemplate(id);
    setDescription("");
    useDiagramStore.setState({ status: "loading", error: null });
    try {
      const res = await fetch("/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: id,
          style: { layout: store.style.layout, theme: store.style.theme },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      applyGraph(data.graph, data.svg, data.width, data.height, data.meta);
      setStyle(data.graph.style ?? store.style);
      toast.success(`Loaded template · ${data.meta.nodeCount} nodes`);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(`Template load failed: ${msg}`);
    }
  }

  async function handleGithubImport() {
    if (!githubUrl.trim()) {
      toast.error("Enter a GitHub repository URL.");
      return;
    }
    setGithubLoading(true);
    setGithubError(null);
    try {
      const res = await fetch("/api/v1/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setDescription(data.description);
      setActiveTab("describe");
      toast.success(`Fetched ${data.fileCount} files from ${data.repo}`);
    } catch (err) {
      const msg = (err as Error).message;
      setGithubError(msg);
      toast.error(`GitHub fetch failed: ${msg}`);
    } finally {
      setGithubLoading(false);
    }
  }

  if (!expanded && graph && graph.nodes.length > 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center gap-2 p-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-teal-500/20 to-emerald-500/20 shrink-0">
            <Wand2 className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <input
            type="text"
            value={store.diagramTitle}
            onChange={(e) => store.setDiagramTitle(e.target.value)}
            placeholder="Untitled architecture"
            className="h-7 px-2 text-sm font-medium bg-transparent border-0 outline-none focus:bg-accent rounded-md w-[180px] shrink-0 min-w-0 truncate"
            aria-label="Diagram title"
          />
          <div className="h-4 w-px bg-border shrink-0" />
          <div className="flex-1 min-w-0" title={description || `Template: ${TEMPLATES.find((t) => t.id === store.templateId)?.name ?? "—"}`}>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Architecture description</div>
            <div className="text-xs text-foreground/90 truncate font-mono">
              {description || `Template: ${TEMPLATES.find((t) => t.id === store.templateId)?.name ?? "—"}`}
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => { setExpanded(true); requestAnimationFrame(() => taRef.current?.focus()); }}>
            <Pencil className="h-3 w-3 mr-1" />Edit
          </Button>
          <Button onClick={handleGenerate} disabled={status === "loading" || !description.trim()} className="h-7 gap-1.5 bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shrink-0">
            {status === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Regenerate
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setExpanded(true)} title="Expand">
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-semibold tracking-tight">Describe your architecture</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{wordCount} words · {charCount} chars</span>
            </div>
            {graph && graph.nodes.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(false)} title="Collapse">
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
          <button
            onClick={() => setActiveTab("describe")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-medium rounded-md transition-colors",
              activeTab === "describe" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Describe
          </button>
          <button
            onClick={() => setActiveTab("github")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-medium rounded-md transition-colors",
              activeTab === "github" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <GitBranch className="h-3.5 w-3.5" />
            From GitHub
          </button>
        </div>

        {/* Describe Tab */}
        {activeTab === "describe" && (
          <>
            <div className="relative">
              <Textarea
                ref={taRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setTaFocused(true)}
                onBlur={() => setTimeout(() => setTaFocused(false), 150)}
                placeholder="e.g. React frontend on Vercel, Node.js API on Lambda, PostgreSQL on RDS, Redis cache, S3 storage, CloudFront CDN..."
                className="min-h-[88px] resize-y pr-28 font-mono text-sm leading-relaxed"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleGenerate();
                  }
                }}
              />
              <Button onClick={handleGenerate} disabled={status === "loading"} className="absolute right-2 bottom-2 h-9 gap-1.5 bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white">
                {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
              </Button>
              {autoOpen && acItems.length > 0 && taFocused && (
                <div className="absolute z-30 left-0 top-[calc(100%+4px)] w-[320px] max-w-full rounded-md border border-border bg-popover shadow-lg overflow-y-auto max-h-60">
                  <ul className="py-1 text-sm">
                    {acItems.map((m) => (
                      <li key={m.id}>
                        <button type="button" onClick={() => insertService(m)} className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-accent text-left">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded" style={{ background: (m.brandColor ?? "#3b82f6") + "22" }}>
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" style={{ stroke: m.brandColor ?? "#3b82f6" }} fill="none" strokeWidth={1.6}>
                              <path d={m.iconPath} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="font-medium truncate">{m.name}</span>
                          <Badge variant="outline" className="ml-auto text-[10px] shrink-0">{m.provider}/{m.type}</Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
                {TEMPLATES.map((t) => (
                  <Button key={t.id} variant={store.templateId === t.id ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleTemplate(t.id)} disabled={status === "loading"} title={t.description}>
                    {t.name}
                    <span className="text-[9px] opacity-60 tabular-nums">{t.nodes.length}</span>
                  </Button>
                ))}
                {description && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDescription("")}>
                    <Trash2 className="h-3 w-3 mr-1" />Clear
                  </Button>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border">⌘/Ctrl</kbd>
                +<kbd className="px-1 py-0.5 rounded bg-muted border border-border">Enter</kbd> to generate
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground">Try:</span>
              {EXAMPLES.map((ex, i) => (
                <Button key={i} variant="ghost" size="sm" className={cn("h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground")} onClick={() => setDescription(ex)}>
                  <FileText className="h-3 w-3 mr-1 shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-[260px]">{ex.slice(0, 60)}…</span>
                </Button>
              ))}
            </div>
          </>
        )}

        {/* GitHub Tab */}
        {activeTab === "github" && (
          <>
            <div className="text-xs text-muted-foreground">
              Paste a GitHub repository URL. We'll fetch the file structure and generate an architecture diagram.
            </div>
            <div className="flex gap-2">
              <Input
                value={githubUrl}
                onChange={(e) => { setGithubUrl(e.target.value); setGithubError(null); }}
                placeholder="https://github.com/owner/repo"
                className="font-mono text-sm"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleGithubImport();
                  }
                }}
              />
              <Button onClick={handleGithubImport} disabled={githubLoading || !githubUrl.trim()} className="gap-1.5 bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shrink-0">
                {githubLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                Fetch
              </Button>
            </div>
            {githubError && (
              <div className="text-xs text-red-500 bg-red-500/10 rounded-md px-3 py-2">{githubError}</div>
            )}
            <div className="text-[10px] text-muted-foreground">
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border">⌘/Ctrl</kbd>
              +<kbd className="px-1 py-0.5 rounded bg-muted border border-border">Enter</kbd> to fetch
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground">Try:</span>
              {GITHUB_EXAMPLES.map((url, i) => (
                <Button key={i} variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground" onClick={() => setGithubUrl(url)}>
                  <ExternalLink className="h-3 w-3 mr-1 shrink-0" />
                  <span className="truncate max-w-[200px]">{url.replace("https://github.com/", "")}</span>
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
