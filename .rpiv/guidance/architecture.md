# Prowl

Local-first metasearch engine for the **litter web** — the indexable, non-commercial web buried by SEO and forgotten by mainstream search. Orchestrates SearXNG (discovery) + Firecrawl (conditional extraction) + Qwen (synthesis) via a hexagonal TypeScript core. v0.1 is local, Pi-first, and bounded — no web UI, database/RAG, Deep Dive, whole-site crawling, or browser interaction.

## Architecture

### Monorepo Structure

```
prowl/
├── packages/
│   ├── core/         — Port interfaces (hexagonal kernel)   → .rpiv/guidance/packages/core/src/architecture.md
│   └── pi/           — pi extension adapter (SearXNG, Firecrawl clients) → .rpiv/guidance/packages/pi/src/architecture.md
├── docs/             — PRD, vision, planning, reference
├── searxng/          — SearXNG engine settings (settings.yml + private)
├── docker-compose.yml— 6 services (searxng, redis, playwright, postgres, rabbitmq, firecrawl)
└── .env              — Service URLs + credentials
```

Dependency flow: `prowl-pi → prowl-core` (unidirectional). Core has zero deps.

### Docker Sidecar Model

Prowl TypeScript code runs **outside Docker** on the host. It calls into containerized services over localhost:

```
Host (Bun/TS)                            Docker
┌────────────────┐               ┌──────────────────────┐
│  prowl-pi       │  HTTP :8888  │  SearXNG              │
│  searxngClient  │ ──────────►  │  (meta-search engine) │
│                 │              └──────────────────────┘
│  firecrawl      │  HTTP :3002  ┌──────────────────────┐
│  scrape()       │ ──────────►  │  Firecrawl            │
│  (CONDITIONAL)  │              │  ┌─────────────────┐  │
│  model (future) │  OpenAI API  │  │ playwright      │  │
└────────────────┘              │  │ redis            │  │
                                 │  │ postgres         │  │
                                 │  │ rabbitmq         │  │
                                 │  └─────────────────┘  │
                                 └──────────────────────┘
```

**Firecrawl is conditional in search mode:** `search` defaults to snippets-only (SearXNG
results synthesized directly). Firecrawl is invoked only when deeper extraction of selected
URLs is needed. **Negative search (PRD §8.4):** before litter-web search, SEO engines
(Google/Bing) are queried to build a per-topic exclusion list, applied to subsequent searches.

**Two address realms:** Docker-internal hostnames (redis, playwright-service) used by Firecrawl ↔ its backends · Host-local `127.0.0.1` ports used by prowl-pi ↔ Docker services.

### Port/Adapter Boundary

Core defines 7 port interfaces (`SearchPort`, `ScrapePort`, `FetchPort`, `ModelPort`, `StoragePort`, `UserPromptPort`, `PresenterPort`). Each adapter implements the subset it needs. See `.rpiv/guidance/packages/core/src/architecture.md` for port definitions and `.rpiv/guidance/packages/pi/src/architecture.md` for current implementations.

## Commands

| Command | Pipeline | Status |
|---------|----------|--------|
| `/prowl search <query>` | PLAN→SCATTER→GATHER→SYNTHESIZE→PRESENT (+EXTRACT under `--read`) | ✅ implemented (v0.1.0) |
| `/prowl query <question>` | READ→SYNTHESIZE→PRESENT | deferred (post-v0.1.0) |
| `/prowl chat <query>` | PLAN/REFLECT→(SCATTER·GATHER·READ)→SYNTHESIZE→PRESENT→REFLECT | deferred (post-v0.1.0) |

Commands are composed from core primitives (PRD §2.1). As of v0.1.0, `packages/pi/src/index.ts`
registers the `/prowl` command (subcommand `search`, with an explicit `--read` evidence-mode
flag) and wires it to the core `search()` composer in `prowl-core` (which owns orchestration,
per the Perplexity dependency rule). `query`/`chat` and the `prowl_search` tool / event hooks
remain deferred past v0.1.0.

**Pipeline primitives** (core, implemented where used by `search`): `PLAN · SCATTER · GATHER · EXTRACT · SYNTHESIZE · PRESENT`. `READ · SCHEMATIZE · REFLECT` are defined/planned but not yet exercised by a shipped command (post-v0.1.0).

## Business Context

Prowl biases toward the **unfiltered, personal, archival, and discarded** corners of the open web — across 6 core languages (ZH, RU, JA, KO, ES, PT). Value proposition: information that is more honest (no commercial incentive), more detailed (personal accounts), more diverse (cross-cultural), and earlier (premature truths).

> **Status note (2026-07-17):** v0.1.0 is implemented and verified against the live Docker stack
> (SearXNG + Firecrawl). `prowl-core` owns the orchestration engine (`pipeline.ts`, `commands.ts`,
> `ranking.ts`, `selection.ts`); `prowl-pi` registers `/prowl search` (+ `--read`) and binds the
> core ports to pi I/O. Deferred past v0.1.0 (see `docs/planning/v0.1-implementation-roadmap.md`
> §5): `query`/`chat` commands, `UserPromptPort`, persistent `StoragePort`/`CatalogPort`, negative
> search, multilingual dork expansion, and public deployment. Treat the architecture as
> intentional direction; the implemented slice is the `search` command.

<important if="you are adding or modifying environment configuration">
### Environment Config Conventions

- Add new vars to `.env.example` with a section header comment and conservative defaults
- Docker-internal URLs go in `docker-compose.yml` → `firecrawl` service `environment` block
- Host-visible URLs (`127.0.0.1`) go in `.env` and are read by adapter clients at module scope
- Prowl vars use `PROWL_` prefix when project-specific; otherwise use the service name (`SEARXNG_URL`, `FIRECRAWL_URL`)
</important>

<important if="you are adding a new Docker service">
### Adding a New Docker Service

1. Add service block in `docker-compose.yml` — image, restart policy, `depends_on` with health conditions
2. Add named volume at bottom if stateful
3. Expose ports as `127.0.0.1:HOST:CONTAINER` (never `0.0.0.0`)
4. Add Docker-internal URL to consuming service's environment block
5. Add host-visible URL + defaults to `.env.example`
</important>
