# Prowl Pi — pi Extension Adapter

## Responsibility

Implement the core port interfaces as thin I/O translators for self-hosted tools (SearXNG, Firecrawl). Adapters contain no business logic or pipeline orchestration — they build requests, parse responses, and map data into core types.

## Dependencies

- **prowl-core**: `SearchPort`, `SearchResult` (type-only imports)
- **openai** (^6.47.0): Will implement `ModelPort` for Qwen synthesis calls
- **zod** (^4.4.3): Config/schema validation for structured data

## Consumers

- **pi extension runtime** (`~/.pi/agent/extensions/prowl/`) — loads adapter as a plugin, registers `/prowl` commands.
- No other monorepo package imports `prowl-pi` (core must not depend on adapters).

## Module Structure

```
src/
├── index.ts               — STUB: needs pi extension entry (commands, tools, hooks)
├── searxng-client.ts      — SearchPort impl: SearXNG JSON API (tested ✅)
├── firecrawl-client.ts    — scrape() function: Firecrawl /v1/scrape (tested ✅)
└── config.ts              — DEFAULT_SCRAPE_OPTIONS + ScrapeOverrides type
```

> **Current state (handoff 2026-07-17):** `searxng-client.ts` and `firecrawl-client.ts` are
> tested and working against the live Docker stack. `index.ts` is a **stub** — it currently only
> re-exports the two clients and does NOT yet register `/prowl` commands, the `prowl_search`
> tool, or event hooks. The pi extension adapter surface is not yet wired.
>
> **Not yet implemented (from handoff):** `dork-planner.ts` (query variation generator),
> `site-catalog.ts` (CatalogPort impl), ModelPort client (OpenAI/Qwen), StoragePort client,
> UserPromptPort + PresenterPort bindings, and the actual command/tool/hook registration.

## Port as Object Literal

Ports are implemented as plain objects (not classes), satisfying the interface structurally.
`searxngClient` is the only port currently wired; `scrape()` is a standalone function that
matches `ScrapePort` but is not yet type-annotated as one.

```typescript
import type { SearchPort, SearchResult } from "prowl-core";

// Env config at module scope — fail fast on startup
const SEARXNG_URL = process.env.SEARXNG_URL ?? "http://127.0.0.1:8888";

// Object literal, type-annotated with port interface
export const searxngClient: SearchPort = {
  async search(query: string, engines?: string[]) {
    const params = new URLSearchParams({ q: query, format: "json" });
    if (engines?.length) params.set("engines", engines.join(","));

    const res = await fetch(`${SEARXNG_URL}/search?${params}`);
    if (!res.ok) throw new Error(`SearXNG error: ${res.status}`);

    const data = (await res.json()) as {
      results: Array<{ title?: string; url?: string; content?: string }>;
    };
    // Map external shape → domain type with nullable fallbacks
    return data.results.map((r) => ({
      title: r.title ?? "(no title)",
      url: r.url ?? "",
      snippet: r.content ?? "",
    }));
  },
};
```

## Config Defaults + Overrides

Extract adapter defaults to a dedicated config module with `as const` for literal types.

```typescript
export const DEFAULT_SCRAPE_OPTIONS = {
  formats: ["markdown"],
  onlyMainContent: true,
  removeBase64Images: true,
  blockAds: true,
  timeout: 20_000,
} as const;                     // literal types from as const

export type ScrapeOverrides = Partial<typeof DEFAULT_SCRAPE_OPTIONS>;
//                              ^ auto-syncs with defaults
```

Consumed in the client via spread merge: `{ url, ...DEFAULT_SCRAPE_OPTIONS, ...overrides }`.

## Env Config Injection (Adapter-Only)

Core never reads `process.env`. Adapters read env at module scope with `??` fallbacks. Defaults match `docker-compose.yml` ports.

```typescript
const SEARXNG_URL   = process.env.SEARXNG_URL   ?? "http://127.0.0.1:8888";
const FIRECRAWL_URL = process.env.FIRECRAWL_URL ?? "http://127.0.0.1:3002";
```

## Architectural Boundaries

- **NO business logic** — no pipeline decisions, no validation rules, no state machines
- **NO core runtime deps** — `import type` only from `prowl-core`
- **NO default exports** — every export is named
- **NO wildcard re-exports** — always `export { name } from "./module.ts"`
- **Adapter owns Pi UI** — command registration, tool registration, and event hooks live here,
  not in core (Perplexity dependency rule: "Adapters own … Pi UI")

<important if="you are implementing the pi extension entry point (index.ts)">
### Wiring the Pi Extension (index.ts)

This is the adapter's public surface. It must:
1. Register commands: `/prowl search`, `/prowl query`, `/prowl chat`
2. Register the LLM-callable tool `prowl_search`
3. Register event hooks: `tool_call` (intercept `prowl_search` → plan → scatter → gather →
   synthesize → present) and `session_shutdown` (persist state)
4. Wire the `ask_user` tool for REFLECT clarifications
5. Deploy target is `~/.pi/agent/extensions/prowl/` (source lives at `packages/pi/`)
</important>

<important if="you are adding a new search engine provider">
### Adding a New Search Provider

1. Create `packages/pi/src/my-engine-client.ts`
2. `import type { SearchPort, SearchResult } from "prowl-core"`
3. Read env URL at module scope: `const URL = process.env.MY_ENGINE_URL ?? "http://localhost:9999"`
4. Export `export const myClient: SearchPort = { async search(query, engines?) { ... } }`
5. Inside `search()`: build params → fetch → error guard → json cast → map to `SearchResult[]`
6. Export in `index.ts`
</important>

<important if="you are adding a new scrape/extraction client">
### Adding a New Scrape Client

1. Add defaults to `config.ts`: `export const DEFAULT_X_OPTIONS = { ... } as const`
2. Create `packages/pi/src/my-scraper-client.ts`
3. Import defaults + derived type: `import { DEFAULT_X_OPTIONS, type XOverrides } from "./config.ts"`
4. Read env URL at module scope
5. Export `async function myScrape(url: string, overrides: XOverrides = {}): Promise<string>`
6. Implement: fetch → error guard → json → unwrap to string
7. Export in `index.ts`
</important>
