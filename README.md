<h1 align="center">vizarch</h1>

<p align="center">
  AI-powered system architecture diagram generator. Describe your infrastructure in plain English, get a production-ready diagram in seconds.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#templates">Templates</a> ·
  <a href="#api">API</a> ·
  <a href="#github-action">GitHub Action</a> ·
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## What it does

vizarch parses natural-language architecture descriptions into structured SVG diagrams with cloud service icons, protocol-labeled edges, and automatic Sugiyama layout. No drag-and-drop, no manual positioning — just describe what you're building.

**Example input:**

```
React frontend on Vercel, Node.js API on Lambda, PostgreSQL on RDS,
Redis cache, S3 storage, CloudFront CDN, SNS notifications, Datadog monitoring
```

**Output:** A layered architecture diagram with 8 nodes, 7 labeled edges, and provider-specific icons — rendered in ~7ms.

## Features

- **AI-powered parsing** — plain English → structured architecture graph
- **188+ cloud service icons** — AWS, GCP, Azure, Kubernetes, generic services
- **Sugiyama layout engine** — hierarchical left-to-right, top-down, or auto-directed
- **Real-time customization** — colors, labels, edges, icon sizes, layout direction
- **Multiple export formats** — SVG, PNG, JSON (with embed codes and QR generation)
- **Shareable links** — generate share URLs with version history and view counts
- **13 preset templates** — serverless, microservices, monolith, K8s platform, and more
- **Mini-map navigation** — pan and zoom on complex diagrams
- **Node search** — filter nodes by name with keyboard shortcut
- **Collaboration** — WebSocket-based real-time cursors and annotations
- **Dark/light themes** — toggle with system preference detection
- **Keyboard shortcuts** — full shortcut palette (press `?` to view)
- **Rate limiting** — tiered Free/Pro/Enterprise limits with persistent counters
- **GitHub Action** — auto-generate diagrams from PR descriptions ([see below](#github-action))

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- [Git](https://git-scm.com/)

### Installation

```bash
git clone https://github.com/hemang2425/vizarch.git
cd vizarch
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database

```bash
npx prisma db push
npx prisma generate
```

### Build

```bash
npm run build
npm start
```

## Templates

vizarch ships with 13 preset architecture templates you can load instantly:

| Template | Description |
|----------|-------------|
| Serverless (AWS) | CloudFront → API Gateway → Lambda → DynamoDB + S3 + SNS |
| Microservices (GKE) | GKE cluster with internal services, Cloud SQL, Memorystore |
| Monolith (AWS) | EC2 + ALB + RDS + ElastiCache + S3 |
| K8s Platform | Kubernetes cluster with ingress, services, persistent volumes |
| Event-Driven (AWS) | SNS → SQS → Lambda → DynamoDB + S3 |
| Fullstack (Next.js) | Vercel frontend, Node.js API, PostgreSQL, Redis |
| And 7 more... | Data pipeline, ML platform, multi-region, and more |

## API

vizarch exposes a REST API for programmatic diagram generation.

### Generate a diagram

```bash
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "React frontend, Node.js API, PostgreSQL, Redis cache",
    "style": { "layout": "horizontal", "theme": "light" }
  }'
```

**Response:**
```json
{
  "svg": "<svg>...</svg>",
  "graph": { "nodes": [...], "edges": [...] },
  "confidence": 0.85,
  "parseTime": 7
}
```

### Save a diagram

```bash
curl -X POST http://localhost:3000/api/v1/diagrams \
  -H "Content-Type: application/json" \
  -d '{ "description": "...", "title": "My Architecture" }'
```

### Retrieve a shared diagram

```bash
GET /api/v1/diagrams/:slug
```

## GitHub Action

vizarch includes a GitHub Action that auto-generates architecture diagrams from PR descriptions.

### Setup

1. Add your vizarch instance URL as a repository secret: `VIZARCH_URL`
2. The action triggers on PR open, edit, and sync
3. Wrap your architecture description in a code block:

````
```vizarch
React frontend on Vercel, Node.js API on Lambda, PostgreSQL on RDS
```
````

4. The action will post the generated SVG as a PR comment

See [`.github/workflows/vizarch-diagram.yml`](.github/workflows/vizarch-diagram.yml) for the full implementation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) (Radix primitives) |
| State | [Zustand 5](https://zustand-demo.pmnd.rs/) |
| Database | [SQLite](https://www.sqlite.org/) via [Prisma 6](https://www.prisma.io/) |
| Runtime | [Bun](https://bun.sh/) |
| Layout | Custom Sugiyama hierarchical layout engine |
| Collaboration | [Socket.io](https://socket.io/) WebSocket service |
| Icons | [Lucide](https://lucide.dev/) + 188 cloud service icons |

## Project Structure

```
vizarch/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # REST API endpoints
│   │   ├── page.tsx            # Main app page
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components
│   │   └── vizarch/            # App-specific components
│   ├── hooks/                  # React hooks (Zustand store, etc.)
│   ├── lib/
│   │   └── vizarch/            # Core engine
│   │       ├── parser.ts       # Natural language → graph
│   │       ├── layout-engine.ts # Sugiyama layout algorithm
│   │       ├── svg-builder.ts  # Graph → SVG rendering
│   │       ├── services.ts     # 188+ cloud service definitions
│   │       ├── templates.ts    # 13 preset architecture templates
│   │       ├── cache.ts        # Diagram caching layer
│   │       ├── exporters/      # SVG, PNG, JSON export
│   │       └── types.ts        # Core type definitions
│   └── middleware.ts           # Edge middleware (security headers, API auth)
├── prisma/
│   └── schema.prisma           # Database schema (Diagrams, Versions, Annotations)
├── tests/                      # Unit tests + visual regression
├── mini-services/              # WebSocket collaboration service
└── public/                     # Static assets
```

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npx bun test --coverage
```

Tests cover the layout engine, cache layer, SVG builder, and type definitions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with Claude + Sugiyama for engineers
</p>
