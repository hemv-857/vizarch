import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  url: z.string().url(),
  token: z.string().max(200).optional(),
});

interface TreeEntry {
  path: string;
  type: string;
  size?: number;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  const parts = cleaned.split("/");
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

function treeToDescription(tree: TreeEntry[], readme: string, repoInfo: { owner: string; repo: string }): string {
  const lines: string[] = [];

  const readmeLines = readme.split("\n").filter((l) => l.trim());
  const firstParagraph = readmeLines
    .filter((l) => !l.startsWith("#") && !l.startsWith("!") && !l.startsWith("[!") && l.trim().length > 10)
    .slice(0, 5)
    .join(" ");

  if (firstParagraph) {
    lines.push(`Project: ${repoInfo.owner}/${repoInfo.repo}`);
    lines.push(`Description: ${firstParagraph}`);
    lines.push("");
  }

  const dirs = new Map<string, TreeEntry[]>();
  const rootFiles: string[] = [];
  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    const parts = entry.path.split("/");
    if (parts.length === 1) {
      rootFiles.push(entry.path);
    } else {
      const topLevel = parts[0];
      if (!dirs.has(topLevel)) dirs.set(topLevel, []);
      dirs.get(topLevel)!.push(entry);
    }
  }

  const configNames = ["package.json", "tsconfig.json", "next.config.js", "next.config.ts",
    "vite.config.ts", "vite.config.js", "docker-compose.yml", "docker-compose.yaml",
    "Dockerfile", "Makefile", "go.mod", "Cargo.toml", "requirements.txt", "pyproject.toml",
    "Gemfile", "pom.xml", "build.gradle", "CMakeLists.txt", ".env.example",
    "turbo.json", "pnpm-workspace.yaml", "lerna.json", "nx.json"];

  const detected = rootFiles.filter((f) => configNames.includes(f));
  if (detected.length > 0) {
    lines.push(`Config files: ${detected.join(", ")}`);
    lines.push("");
  }

  lines.push("Directory structure:");
  for (const [dir, entries] of [...dirs.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const subdirs = new Set<string>();
    for (const e of entries) {
      const parts = e.path.split("/");
      if (parts.length > 2) subdirs.add(parts[1]);
    }
    const depth1Count = entries.filter((e) => e.path.split("/").length === 2).length;
    if (subdirs.size > 0) {
      lines.push(`  ${dir}/ - ${depth1Count} files, subdirs: ${[...subdirs].slice(0, 8).join(", ")}${subdirs.size > 8 ? "..." : ""}`);
    } else {
      lines.push(`  ${dir}/ - ${depth1Count} files`);
    }
  }

  return lines.join("\n");
}

async function fetchGitHub(owner: string, repo: string, path: string, token?: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "vizarch/1.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/${path}`, {
    headers,
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.text();
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const repoInfo = parseGitHubUrl(parsed.data.url);
  if (!repoInfo) {
    return NextResponse.json({ error: "Invalid GitHub URL. Use format: https://github.com/owner/repo" }, { status: 400 });
  }

  const token = parsed.data.token;

  try {
    const [treeRes, readmeText] = await Promise.all([
      fetchGitHub(repoInfo.owner, repoInfo.repo, "git/trees/main?recursive=1", token).catch(() =>
        fetchGitHub(repoInfo.owner, repoInfo.repo, "git/trees/master?recursive=1", token),
      ),
      fetchGitHub(repoInfo.owner, repoInfo.repo, "readme", token).catch(() => ""),
    ]);

    const treeData = JSON.parse(treeRes) as { tree: TreeEntry[] };
    const tree = treeData.tree ?? [];

    let readme = "";
    if (readmeText) {
      try {
        const readmeData = JSON.parse(readmeText) as { content?: string; encoding?: string };
        if (readmeData.content && readmeData.encoding === "base64") {
          readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
        }
      } catch {
        readme = "";
      }
    }

    const description = treeToDescription(tree, readme, repoInfo);

    return NextResponse.json({
      ok: true,
      repo: `${repoInfo.owner}/${repoInfo.repo}`,
      fileCount: tree.filter((e) => e.type === "blob").length,
      description,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch repository", message: (err as Error).message },
      { status: 502 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "vizarch-github",
    version: "v1",
    usage: "POST /api/v1/github with { url: 'https://github.com/owner/repo', token?: 'ghp_...' }",
  });
}
