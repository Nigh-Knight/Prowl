export type {
  CatalogPort,
  FetchPort,
  ModelPort,
  PresenterPort,
  ScrapePort,
  SearchPort,
  SearchResult,
  SiteEntry,
  StoragePort,
  UserPromptPort,
} from "./ports.ts";

// Pipeline primitives (PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT).
export {
  formatSearchOutput,
  gather,
  parseQueryPlan,
  plan,
  present,
  scatter,
  synthesize,
  buildSynthesisPrompt,
} from "./pipeline.ts";
export type { QueryPlan } from "./pipeline.ts";

// Command composers.
export { search } from "./commands.ts";
export type { SearchDeps, SearchInput, SearchOutput } from "./commands.ts";

// Ranking / selection policy.
export {
  dedupeResults,
  normalizeResults,
  normalizeUrl,
  rankResults,
  selectForSynthesis,
} from "./ranking.ts";
