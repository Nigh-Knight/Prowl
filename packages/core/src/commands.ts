// commands.ts — command composers that wire pipeline primitives to ports.
//
// Adapters inject concrete port implementations at call time; core owns no I/O.
// The `search` composer is the v0.1 vertical slice: snippets-only, no Firecrawl.

import type {
  ModelPort,
  PresenterPort,
  SearchPort,
  SearchResult,
} from "./ports.ts";
import {
  formatSearchOutput,
  gather as gatherStep,
  plan as planStep,
  present as presentStep,
  scatter as scatterStep,
  synthesize as synthesizeStep,
} from "./pipeline.ts";
import type { QueryPlan } from "./pipeline.ts";
import { selectForSynthesis } from "./ranking.ts";

/** Input to the `search` command. */
export interface SearchInput {
  query: string;
  engines?: string[];
}

/** Ports the `search` command needs. Supplied by the adapter at call time. */
export interface SearchDeps {
  search: SearchPort;
  model: ModelPort;
  present: PresenterPort;
}

/** Output of the `search` command: synthesized summary + cited sources. */
export interface SearchOutput {
  summary: string;
  sources: SearchResult[];
}

/**
 * `search` composer — PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT.
 *
 * Snippets-only (no Firecrawl). Renders the synthesized summary + bounded
 * source list via the presenter, and returns the structured output for
 * programmatic use / later phases.
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

  // SYNTHESIZE — call the model with the gathered snippets.
  const summary = await synthesizeStep(deps.model, input.query, gathered);

  // PRESENT — render the summary + a bounded source list.
  const shown = selectForSynthesis(gathered, 8);
  const content = formatSearchOutput(summary, shown);
  await presentStep(deps.present, content);

  return { summary, sources: gathered };
}
