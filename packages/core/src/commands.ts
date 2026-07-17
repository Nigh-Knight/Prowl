// commands.ts — command composers that wire pipeline primitives to ports.
//
// Adapters inject concrete port implementations at call time; core owns no I/O.
// The `search` composer is the v0.1 vertical slice. Default is snippets-only
// (no Firecrawl); read (`--read`) mode adds a bounded EXTRACT step.

import type {
  ModelPort,
  PresenterPort,
  ScrapePort,
  SearchPort,
  SearchResult,
} from "./ports.ts";
import {
  extract as extractStep,
  formatSearchOutput,
  gather as gatherStep,
  plan as planStep,
  present as presentStep,
  scatter as scatterStep,
  synthesize as synthesizeStep,
} from "./pipeline.ts";
import type { QueryPlan } from "./pipeline.ts";
import { normalizeUrl, selectForSynthesis } from "./ranking.ts";
import { selectForExtraction } from "./selection.ts";

/** Input to the `search` command. */
export interface SearchInput {
  query: string;
  engines?: string[];
  /** When true, run EXTRACT on a bounded set before SYNTHESIZE (evidence mode). */
  readMode?: boolean;
}

/** Ports the `search` command needs. Supplied by the adapter at call time. */
export interface SearchDeps {
  search: SearchPort;
  model: ModelPort;
  present: PresenterPort;
  /** Optional — only used in read mode. Omit for the default snippets-only path. */
  scrape?: ScrapePort;
}

/** Max URLs scraped in read (`--read`) mode (plan allows 3–5). */
export const EXTRACTION_BUDGET = 5;

/** Output of the `search` command: synthesized summary + cited sources. */
export interface SearchOutput {
  summary: string;
  sources: SearchResult[];
}

/**
 * `search` composer — PLAN → SCATTER → GATHER → [EXTRACT] → SYNTHESIZE → PRESENT.
 *
 * Default is snippets-only (no Firecrawl). When `input.readMode` is set and a
 * `scrape` port is supplied, a bounded, diverse set of results is extracted
 * (EXTRACT) and their full markdown flows into SYNTHESIZE. Renders the
 * synthesized summary + bounded source list via the presenter, and returns the
 * structured output for programmatic use / later phases.
 */
export async function search(
  input: SearchInput,
  deps: SearchDeps,
): Promise<SearchOutput> {
  // PLAN — reform the query into a query set via the model.
  const planResult: QueryPlan = await planStep(input.query, deps.model);

  // SCATTER — fan the query set out to the search port.
  const raw = await scatterStep(deps.search, planResult.querySet, input.engines);

  // GATHER — normalize, dedupe, and rank the scattered results.
  const gathered = await gatherStep(raw);

  // EXTRACT (read mode only) — bounded, diverse, conditional Firecrawl.
  // Gated on BOTH `readMode` and a supplied `scrape` port, so the default
  // snippets-only path performs zero Firecrawl calls. On success the selected
  // results are enriched with full markdown (`content`) for synthesis.
  let synthesisInput: SearchResult[] = gathered;
  if (input.readMode && deps.scrape) {
    const selected = selectForExtraction(gathered, EXTRACTION_BUDGET);
    const enriched = await extractStep(deps.scrape, selected);
    const byUrl = new Map(enriched.map((r) => [normalizeUrl(r.url), r]));
    synthesisInput = gathered.map((r) => byUrl.get(normalizeUrl(r.url)) ?? r);
  }

  // SYNTHESIZE — call the model with the gathered snippets / extracted content.
  const summary = await synthesizeStep(deps.model, input.query, synthesisInput);

  // PRESENT — render the summary + a bounded source list.
  const shown = selectForSynthesis(synthesisInput, 8);
  const content = formatSearchOutput(summary, shown);
  await presentStep(deps.present, content);

  return { summary, sources: synthesisInput };
}
