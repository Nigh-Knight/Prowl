export type {
  CatalogPort,
  FetchPort,
  ModelPort,
  PresenterPort,
  PresenterResult,
  ScrapePort,
  SearchPort,
  SearchResult,
  TelemetryEvent,
  SiteEntry,
  StoragePort,
  UserPromptPort,
} from "./ports.ts";

// Pipeline primitives (PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT).
export {
  extract,
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
export { search, EXTRACTION_BUDGET } from "./commands.ts";
export type { SearchDeps, SearchInput, SearchOutput } from "./commands.ts";

// Ranking / selection policy.
export {
  dedupeResults,
  LITTER_ENGINES,
  normalizeResults,
  normalizeUrl,
  rankResults,
  selectForSynthesis,
} from "./ranking.ts";
export { selectForExtraction } from "./selection.ts";
