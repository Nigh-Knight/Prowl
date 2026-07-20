// commands.ts — command composers that wire pipeline primitives to ports.
//
// Adapters inject concrete port implementations at call time; core owns no I/O.
// The `search` composer is the v0.1 vertical slice. Default is snippets-only
// (no Firecrawl); read (`--read`) mode adds a bounded EXTRACT step.

import type {
  ModelPort, PresenterPort, ScrapePort, SearchPort, SearchResult, TelemetryEvent,
} from "./ports.ts";
import {
  extract as extractStep,
  gather as gatherStep,
  plan as planStep,
  present as presentStep,
  rerank as rerankStep,
  scatter as scatterStep,
  synthesize as synthesizeStep,
  buildPlanPrompt,
  buildSynthesisPrompt,
} from "./pipeline.ts";
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
  /** Optional — emit structured stage telemetry (queries, engines, counts, reasons). */
  debug?: (event: TelemetryEvent) => void;
}

/** Max URLs scraped in read (`--read`) mode (plan allows 3–5). */
export const EXTRACTION_BUDGET = 5;

/** Output of the `search` command: synthesized summary + cited sources. */
export interface SearchOutput {
  summary: string;
  sources: SearchResult[];
}

/**
 * `search` composer — PLAN → SCATTER → GATHER → RERANK → [EXTRACT] → SYNTHESIZE → PRESENT.
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
  await deps.present.setStatus?.("prowl-stage", "\u{1F4CB} Planning queries\u2026");
  await deps.present.progress?.("\u{1F4CB} Planning queries\u2026");
  const planResult = await planStep(input.query, deps.model);
  deps.debug?.({
    stage: "plan",
    detail: `planned ${planResult.querySet.length} queries`,
    counts: { queries: planResult.querySet.length },
    prompt: buildPlanPrompt(input.query),
    rawResponse: "",
  });

  await deps.present.setStatus?.("prowl-stage", "\u{1F50D} Searching SearXNG\u2026");
  await deps.present.progress?.("\u{1F50D} Searching SearXNG\u2026");
  const raw = await scatterStep(deps.search, planResult.querySet, input.engines);
  deps.debug?.({
    stage: "scatter",
    detail: `scattered ${planResult.querySet.length} queries`,
    counts: { queries: planResult.querySet.length, results: raw.length },
    queries: planResult.querySet,
    rawSearchResults: raw,
  });

  await deps.present.setStatus?.("prowl-stage", "\u{1F4CA} Ranking and deduplicating\u2026");
  await deps.present.progress?.("\u{1F4CA} Ranking and deduplicating\u2026");
  const gathered = await gatherStep(raw);
  deps.debug?.({
    stage: "gather",
    detail: `deduped ${raw.length} → ${gathered.length} results`,
    counts: { raw: raw.length, gathered: gathered.length },
  });

  await deps.present.setStatus?.("prowl-stage", "\u{1F50D} Filtering relevance\u2026");
  await deps.present.progress?.("\u{1F50D} Filtering relevance\u2026");
  const reranked = await rerankStep(input.query, gathered, deps.model);
  let relevant = reranked.kept;
  deps.debug?.({
    stage: "rerank",
    detail: `reranked ${gathered.length} → ${reranked.kept.length} kept`,
    counts: { input: gathered.length, kept: reranked.kept.length, dropped: reranked.dropped.length },
    reasons: reranked.dropped.map((d) => d.url),
  });

  // EXTRACT (read mode only) — bounded, diverse, conditional Firecrawl.
  if (input.readMode && deps.scrape) {
    await deps.present.setStatus?.("prowl-stage", "\u{1F4D6} Reading pages\u2026");
    await deps.present.progress?.("\u{1F4D6} Reading pages\u2026");
    const selected = selectForExtraction(relevant, EXTRACTION_BUDGET);
    const enriched = await extractStep(deps.scrape, selected);
    const byUrl = new Map(enriched.map((r) => [normalizeUrl(r.url), r]));
    relevant = relevant.map((r) => byUrl.get(normalizeUrl(r.url)) ?? r);
    deps.debug?.({
      stage: "extract",
      detail: `extracted ${selected.length} pages`,
      counts: { selected: selected.length },
      rawSearchResults: enriched,
    });
  }

  // In --read mode, keep only successfully-read results (Issue 9).
  // Only filters when a scrape port was actually used; without a scrape port,
  // readMode falls back to snippets-only (no results have readStatus).
  const synthesisInput = input.readMode && deps.scrape
    ? relevant.filter((r) => r.readStatus === "read")
    : relevant;

  // Empty-result guard (Issue 10): no usable sources → say so, no uncited model answer.
  if (synthesisInput.length === 0) {
    await deps.present.setStatus?.("prowl-stage", undefined);
    await deps.present.progress?.("No sources found.");
    await presentStep(deps.present, { query: input.query, summary: "No sources found.", sources: [] });
    return { summary: "No sources found.", sources: [] };
  }

  await deps.present.setStatus?.("prowl-stage", "\u270F\uFE0F Synthesizing findings\u2026");
  await deps.present.progress?.("\u270F\uFE0F Synthesizing findings\u2026");

  // ── SYNTHESIZE with optional streaming ──
  // When both the model and presenter support streaming, forward incremental
  // chunks to the presenter as they arrive. Otherwise fall back to the
  // buffered synthesize() path.
  let summary: string;
  if (deps.model.generateStream && deps.present.stream) {
    const prompt = buildSynthesisPrompt(input.query, synthesisInput);
    const chunks: string[] = [];
    for await (const chunk of deps.model.generateStream(prompt)) {
      chunks.push(chunk);
      await deps.present.stream(chunk);
    }
    summary = chunks.join("");
  } else {
    summary = await synthesizeStep(deps.model, input.query, synthesisInput);
  }
  // ── end streaming block ──
  const shown = selectForSynthesis(synthesisInput, 8);
  deps.debug?.({ stage: "present", detail: "rendering result", counts: { shown: shown.length } });
  await presentStep(deps.present, { query: input.query, summary, sources: shown });

  // Clear the stage indicator
  await deps.present.setStatus?.("prowl-stage", undefined);

  return { summary, sources: synthesisInput };
}
