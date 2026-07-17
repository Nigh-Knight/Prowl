# Prowl

Local-first metasearch engine for the **litter web** — the indexable, non-commercial web buried by SEO and forgotten by mainstream search. Orchestrates SearXNG (discovery) + Firecrawl (extraction) + Qwen (synthesis) via a hexagonal TypeScript core.

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
│                 │              │  ┌─────────────────┐  │
│  model (future) │  OpenAI API  │  │ playwright      │  │
└────────────────┘              │  │ redis            │  │
                                 │  │ postgres         │  │
                                 │  │ rabbitmq         │  │
                                 │  └─────────────────┘  │
                                 └──────────────────────┘
```

**Two address realms:** Docker-internal hostnames (redis, playwright-service) used by Firecrawl ↔ its backends · Host-local `127.0.0.1` ports used by prowl-pi ↔ Docker services.

### Port/Adapter Boundary

Core defines 7 port interfaces (`SearchPort`, `ScrapePort`, `FetchPort`, `ModelPort`, `StoragePort`, `UserPromptPort`, `PresenterPort`). Each adapter implements the subset it needs. See `.rpiv/guidance/packages/core/src/architecture.md` for port definitions and `.rpiv/guidance/packages/pi/src/architecture.md` for current implementations.

## Commands

| Command | Pipeline | Status |
|---------|----------|--------|
| `/prowl search <query>` | PLAN→SCATTER→GATHER→SYNTHESIZE→PRESENT | TBD |
| `/prowl query <question>` | READ→SYNTHESIZE→PRESENT | TBD |
| `/prowl chat <query>` | PLAN/REFLECT→(SCATTER·GATHER·READ)→SYNTHESIZE→PRESENT→REFLECT | TBD |

Commands are composed from core primitives. Implementations will live in a future pipeline engine in `prowl-core`.

## Business Context

Prowl biases toward the **unfiltered, personal, archival, and discarded** corners of the open web — across 6 core languages (ZH, RU, JA, KO, ES, PT). Value proposition: information that is more honest (no commercial incentive), more detailed (personal accounts), more diverse (cross-cultural), and earlier (premature truths).

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
