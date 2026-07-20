// ── Ports ───────────────────────────────────────────────────────────────────
// Environment-agnostic interfaces that adapters (prowl-pi, prowl-web, prowl-cli)
// implement. Core depends only on these abstractions — never on concrete tools.

/** A single search result from any engine. */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  engine?: string;
  /**
   * Full extracted content (markdown) when available. Populated by the EXTRACT
   * step in read (`--read`) mode; absent in the default snippets-only path.
   */
  content?: string;
  /**
   * Read outcome in `--read` mode. `"read"` = successfully fetched and attached
   * to `content`; `"failed"` = scrape error or dead URL (dropped from final
   * citations); undefined on the default snippets-only path. Enables `--debug`
   * to report read/failed per URL (Issue 9).
   */
  readStatus?: "read" | "failed";
}

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
  /**
   * Optional streaming variant. When present, `generateStream` returns an
   * async iterable of text chunks that the caller can forward to the presenter
   * incrementally. Used by the SYNTHESIZE step to stream model output as it
   * arrives (Phase 3). PLAN and RERANK remain on the buffered `generate()`.
   */
  generateStream?(prompt: string, opts?: Record<string, unknown>): AsyncIterable<string>;
}

/** A single site entry in the litter-web catalog. */
export interface SiteEntry {
  url: string;
  language?: string;
  category?: string;
  authorityTier?: "raw" | "commercial" | "authoritative";
}

/**
 * Tenant-scoped site catalog (litter-web index).
 * Contract defined now; fs implementation deferred to post-slice phase.
 */
export interface CatalogPort {
  getSites(tenantId: string): Promise<SiteEntry[]>;
  addSite(tenantId: string, site: SiteEntry): Promise<void>;
}

/**
 * Persistent storage (key-value, tenant-scoped from the start, PRD §11.2).
 * Contract defined now; fs implementation deferred to post-slice phase.
 */
export interface StoragePort {
  get(tenantId: string, key: string): Promise<string | null>;
  set(tenantId: string, key: string, value: string): Promise<void>;
}

/** Ask the user for clarification mid-pipeline. */
export interface UserPromptPort {
  ask(question: string): Promise<string>;
}

/** Structured payload the presenter renders as the final Prowl result. */
export interface PresenterResult {
  /** The user's original search query — shown in the durable transcript entry. */
  query: string;
  /** Synthesized summary prose (inline `[n]` citations; no `Sources:` list). */
  summary: string;
  /** Bounded, diverse, relevant sources rendered as the single Sources list. */
  sources: SearchResult[];
}

/** Structured stage telemetry for `--debug` (no secrets / chain-of-thought). */
export interface TelemetryEvent {
  stage: "plan" | "scatter" | "gather" | "rerank" | "extract" | "present";
  detail: string;
  counts?: Record<string, number>;
  reasons?: string[];
  /** The prompt text sent to the model (plan prompt, rerank prompt, synthesis prompt). */
  prompt?: string;
  /** The raw response text received from the model. */
  rawResponse?: string;
  /** Raw search results for the scatter/gather stages (non-normalized). */
  rawSearchResults?: SearchResult[];
  /** The query strings sent to the search engine (scatter stage). */
  queries?: string[];
}

/** Render final output. */
export interface PresenterPort {
  /** Render the structured result as a durable, persisted transcript entry. */
  present(result: PresenterResult): Promise<void>;
  /** Optional transient progress text (e.g. "Searching…"). Bound to ui.notify. */
  progress?(message: string): Promise<void>;
  /**
   * Optional persistent status line key/value. Bound to ctx.ui.setStatus() for
   * footer status during pipeline execution. Pass `undefined` as text to clear
   * a previously-set key.
   */
  setStatus?(key: string, text: string | undefined): Promise<void>;
  /**
   * Optional streaming text update. When set, called by the SYNTHESIZE step
   * with each incremental chunk as it arrives from the model. Implementations
   * update the UI incrementally rather than buffering the full response.
   */
  stream?(chunk: string): Promise<void>;
}
