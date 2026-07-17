# Prowl Core

## Responsibility

Define the **port interfaces** (abstractions) that decouple Prowl's engine from infrastructure. Core is the inner hexagon in a hexagonal architecture — adapters implement the ports, core never imports adapters. The future pipeline orchestration engine will live here, composing ports into command pipelines.

## Dependencies

- **None (zero runtime deps).** Only `typescript` as peer dep and `@types/bun` as dev dep.

## Consumers

- **prowl-pi** (`packages/pi/`): Implements `SearchPort` via SearXNG; will implement `ScrapePort`, `ModelPort`, `StoragePort`, `UserPromptPort`, `PresenterPort`.
- **prowl-web / prowl-cli** (future): Additional adapter implementations.

## Module Structure

```
src/
├── ports.ts     — All 7 port interfaces + SearchResult data type
└── index.ts     — Type-only barrel re-export
```

## Port Interface Definition

Every port is a single-method async interface. Adapters satisfy it structurally (no class `implements` needed).

```typescript
/** Multi-engine search port. */
export interface SearchPort {
  search(query: string, engines?: string[]): Promise<SearchResult[]>;
}

/** URL → extracted content (markdown). */
export interface ScrapePort {
  scrape(url: string, opts?: Record<string, unknown>): Promise<string>;
}

/** Raw URL fetch (non-JS). */
export interface FetchPort {
  fetch(url: string): Promise<string>;
}

/** Model-based reasoning / synthesis. */
export interface ModelPort {
  generate(prompt: string, opts?: Record<string, unknown>): Promise<string>;
}

/** Persistent storage (key-value, tenant-scoped). */
export interface StoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/** Ask the user for clarification mid-pipeline. */
export interface UserPromptPort {
  ask(question: string): Promise<string>;
}

/** Render final output. */
export interface PresenterPort {
  present(content: string): Promise<void>;
}
```

Conventions: `Port` suffix · single method per port · `Promise<T>` · primitive-only params · errors via `throw` (no `Result<T,E>`) · `| null` for optional returns (never `undefined`) · JSDoc on every type.

## Pipeline Composition (projected — v0.1+)

Pipelines compose ports into command flows. Adapters inject concrete implementations at call time.

```typescript
// search: PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT
export async function search(
  input:   { query: string; engines?: string[] },
  deps:    { search: SearchPort; model: ModelPort; present: PresenterPort },
): Promise<{ summary: string; sources: SearchResult[] }> { ... }
```

Command compositions: `search` = PLAN→SCATTER→GATHER→SYNTHESIZE→PRESENT · `query` = READ→SYNTHESIZE→PRESENT · `chat` = PLAN/REFLECT→(SCATTER·GATHER·READ)→SYNTHESIZE→PRESENT→REFLECT

## Architectural Boundaries

- **NO runtime dependencies** — core is pure TypeScript types. It is erased at runtime.
- **NO concrete tools** — core never calls `fetch`, reads `process.env`, or touches I/O.
- **NO business logic** — core defines the shape of pipelines, not the behavior. That's the adapter's job.

<important if="you are adding a new port interface">
### Adding a New Port

1. Add the interface to `ports.ts` — single async method, `Port` suffix, primitive params only
2. JSDoc every type and method (this IS the spec)
3. Re-export from `index.ts` in the existing `export type` block (sorted alphabetically)
4. Implement in each adapter (see `.rpiv/guidance/packages/pi/src/architecture.md`)
</important>
