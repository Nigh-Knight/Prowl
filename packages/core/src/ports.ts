// ── Ports ───────────────────────────────────────────────────────────────────
// Environment-agnostic interfaces that adapters (prowl-pi, prowl-web, prowl-cli)
// implement. Core depends only on these abstractions — never on concrete tools.

/** A single search result from any engine. */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  engine?: string;
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

/** Render final output. */
export interface PresenterPort {
  present(content: string): Promise<void>;
}
