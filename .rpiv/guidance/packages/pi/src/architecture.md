# Prowl Pi — pi Extension Adapter

## Responsibility

Implement the core port interfaces as thin I/O translators for self-hosted tools (SearXNG, Firecrawl). Adapters contain no business logic or pipeline orchestration — they build requests, parse responses, and map data into core types.

## Dependencies

- **prowl-core**: `SearchPort`, `SearchResult`, `ModelPort`, `PresenterPort`, `ScrapePort` (type-only imports)
- **openai** (^6.47.0): implements `ModelPort` for Qwen synthesis calls (`model-client.ts`)
- **zod** (^4.4.3): Config/schema validation for structured data

## Consumers

- **pi extension runtime** (`~/.pi/agent/extensions/prowl/`) — loads adapter as a plugin, registers `/prowl` commands.
- No other monorepo package imports `prowl-pi` (core must not depend on adapters).

## Module Structure

```
src/
├── index.ts               — pi extension entry point: registers `/prowl` (search + --read) ✅
├── searxng-client.ts      — SearchPort impl: SearXNG JSON API (tested ✅)
├── firecrawl-client.ts    — scrape() + scrapePort: ScrapePort (tested ✅)
├── model-client.ts        — ModelPort impl: OpenAI-compatible Qwen (PLAN + SYNTHESIZE)
├── pi-ports.ts            — PresenterPort impl: binds host `ctx.ui.notify`
└── config.ts              — DEFAULT_SCRAPE_OPTIONS + ScrapeOverrides type
```

> **Current state (2026-07-17):** v0.1.0 is **implemented** end-to-end and verified against the
> live Docker stack. `index.ts` registers the `/prowl` command (subcommand `search`, with an
> explicit `--read` evidence-mode flag) and wires it to the core `search()` composer, injecting
> `searxngClient` (SearchPort), `modelClient` (ModelPort), `presenterPort` (PresenterPort), and
> `scrapePort` (ScrapePort, passed only when `--read` is set so the default path makes zero
> Firecrawl calls). `searxng-client.ts`, `firecrawl-client.ts`, and `model-client.ts` are
> implemented and working; `pi-ports.ts` wraps the host render surface (`ctx.ui.notify`) as a
> structurally-typed `PresenterPort`. Tests exist: `packages/core/test/search.test.ts` and
> `packages/pi/test/smoke.test.ts`.
>
> **Not yet implemented (deferred past v0.1.0, see `v0.1-implementation-roadmap.md` §5):**
> `UserPromptPort` (and the `REFLECT`/`ask_user` flow), persistent fs `StoragePort`/
> `CatalogPort` impls (`site-catalog.ts`), `dork-planner.ts` (multilingual query variation),
> and the Pi deploy under `~/.pi/agent/extensions/prowl/` (the adapter is built but not yet
> deployed there). The `query`/`chat` commands and `prowl_search` tool / event hooks also remain
> post-v0.1.0.

## Port as Object Literal

Ports are implemented as plain objects (not classes), satisfying the interface structurally.
`searxngClient` is the only port originally wired; `scrape()` is a standalone function that
matches `ScrapePort` and is exported as the `scrapePort` object literal below. `modelClient`
and `presenterPort` follow the same pattern.

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

This is the adapter's public surface. As of v0.1.0 it registers the `/prowl` command
(subcommand `search`, with an explicit `--read` evidence-mode flag) and wires it to the core
`search()` composer, injecting the concrete ports. The remaining surface is deferred past
v0.1.0:
1. (done v0.1.0) Register `/prowl search` (+ `--read`); inject `searxngClient`, `modelClient`, `presenterPort`, and `scrapePort` (only when `--read` is set).
2. Register the LLM-callable tool `prowl_search` — **deferred** (post-v0.1.0).
3. Register event hooks: `tool_call` (intercept `prowl_search` → plan → scatter → gather →
   synthesize → present) and `session_shutdown` (persist state) — **deferred** (post-v0.1.0).
4. Wire the `ask_user` tool for REFLECT clarifications (`UserPromptPort`) — **deferred** (post-v0.1.0).
5. Deploy target is `~/.pi/agent/extensions/prowl/` (source lives at `packages/pi/`) — **not yet deployed**.
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
