// pipeline.ts — primitive functions composing the core search pipeline.
//
// Each primitive is a single pipeline step. The `search` composer in
// commands.ts wires them into PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT.
// Core owns no I/O: every step receives its ports as arguments.

import type {
  ModelPort, PresenterPort, PresenterResult, ScrapePort, SearchPort, SearchResult,
} from "./ports.ts";
import { normalizeResults, rankResults, selectForSynthesis } from "./ranking.ts";

/** Output of the PLAN step: a (re)formed set of queries to scatter. */
export interface QueryPlan {
  querySet: string[];
}

/**
 * PLAN — reform the user query into a query set via the model.
 * v0.1 single-language planning stub: Qwen reforms the query into 1–5
 * variants. Falls back to the original query on any parse failure.
 */
export async function plan(
  query: string,
  model: ModelPort,
): Promise<QueryPlan> {
  const raw = await model.generate(buildPlanPrompt(query));
  return { querySet: parseQueryPlan(raw, query) };
}

function buildPlanPrompt(query: string): string {
  return [
    "You are a metasearch query planner for the litter web — the",
    "non-commercial, personal, archival corners of the open web.",
    "Given the user's query, return a JSON array of 1 to 12 search",
    "query strings (same language as the user) that best surface",
    "personal accounts, archives, and niche sources.",
    'Respond with ONLY the JSON array, e.g. ["query one","query two"].',
    `User query: ${query}`,
  ].join("\n");
}

/** Parse a model response into a query set; falls back to [fallback]. */
export function parseQueryPlan(raw: string, fallback: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [fallback];

  // 1) Strict JSON array of strings.
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      const strings = parsed
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter((x) => x.length > 0);
      if (strings.length > 0) return strings.slice(0, 12);
    }
  } catch {
    // not JSON — fall through to line-based parsing
  }

  // 2) Line / comma separated list (strip surrounding brackets + quotes).
  const lines = trimmed
    .replace(/^\[+/, "")
    .replace(/\]+$/, "")
    .split(/[\n,]/)
    .map((s) => s.replace(/^["'\s]+|["'\s]+$/g, "").trim())
    .filter((s) => s.length > 0);
  if (lines.length > 0) return lines.slice(0, 12);

  return [fallback];
}

/**
 * SCATTER — fan the query set out to the search port (one call per query)
 * and merge the resulting batches.
 */
export async function scatter(
  search: SearchPort,
  querySet: string[],
  engines?: string[],
): Promise<SearchResult[]> {
  const batches = await Promise.all(
    querySet.map((q) => search.search(q, engines)),
  );
  const merged: SearchResult[] = [];
  for (const batch of batches) {
    for (const r of batch) merged.push(r);
  }
  return merged;
}

/**
 * GATHER — normalize, dedupe, and rank the scattered results.
 * Normalization (whitespace) lives in ranking policy.
 */
export async function gather(results: SearchResult[]): Promise<SearchResult[]> {
  return rankResults(normalizeResults(results));
}

/**
 * EXTRACT — scrape the bounded selected set via the ScrapePort, attaching the
 * returned markdown to each result as `content`. Gated on `readMode` by the
 * caller (commands.ts); never invoked in the default snippets-only path, so
 * Firecrawl stays conditional. A single scrape failure keeps that result
 * snippet-only rather than aborting the whole search.
 */
export async function extract(
  scrape: ScrapePort,
  selected: SearchResult[],
): Promise<SearchResult[]> {
  return Promise.all(
    selected.map(async (r): Promise<SearchResult> => {
      try {
        const content = await scrape.scrape(r.url);
        return { ...r, content, readStatus: "read" };
      } catch (err) {
        console.warn(
          `[prowl] scrape failed for ${r.url}: ${err instanceof Error ? err.message : err}`,
        );
        return { ...r, readStatus: "failed" };
      }
    }),
  );
}


/**
 * Build the bounded relevance-rerank prompt: ask the model to keep only
 * candidates that serve the query, returning a JSON array of {index, reason}.
 */
function buildRerankPrompt(query: string, results: SearchResult[]): string {
  const list = results
    .map((r, i) => {
      const title = r.title || r.url;
      const body = r.content && r.content.trim().length > 0 ? r.content : r.snippet;
      return `[${i + 1}] ${title}\nURL: ${r.url}\n${body}`;
    })
    .join("\n\n");
  return [
    "You are a relevance filter for a litter-web research search.",
    "Given the user's query and a list of candidate search results, keep only",
    "candidates that actually serve the query, or that are clearly useful",
    "discovery leads (a community, term, or archive related to the request).",
    "Reject candidates that are off-topic, generic, or only tangentially related.",
    "",
    `Query: ${query}`,
    "",
    "Candidates:",
    list,
    "",
    'Respond with ONLY a JSON array of objects you KEEP, each {"index": <1-based>, "reason": "<short why relevant>"}. Omit rejected candidates. Example:',
    '[{"index": 1, "reason": "personal Neocities fansite"}, {"index": 3, "reason": "archive of late-2000s web design"}]',
  ].join("\n");
}

export interface RerankResult {
  kept: SearchResult[];
  dropped: { url: string; reason: string }[];
}

/**
 * Bounded relevance rerank (Issue 4): ONE ModelPort call over the gathered set.
 * On a malformed/blank model response, KEEP ALL candidates (resilient — a
 * formatting glitch must not drop every result). An explicit empty array `[]`
 * (model rejected everything) is honored → drop all.
 */
export async function rerank(
  query: string,
  results: SearchResult[],
  model: ModelPort,
): Promise<RerankResult> {
  if (results.length === 0) return { kept: [], dropped: [] };
  const raw = await model.generate(buildRerankPrompt(query, results));
  const keptIdx = parseRerankIndexes(raw, results.length);
  const kept: SearchResult[] = [];
  const dropped: { url: string; reason: string }[] = [];
  results.forEach((r, i) => {
    if (keptIdx.has(i + 1)) kept.push(r);
    else dropped.push({ url: r.url, reason: "not kept by relevance filter" });
  });
  return { kept, dropped };
}

function parseRerankIndexes(raw: string, total: number): Set<number> {
  const trimmed = raw.trim();
  if (!trimmed) return new Set(Array.from({ length: total }, (_, i) => i + 1)); // silent → keep all
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      const set = new Set<number>();
      for (const item of parsed) {
        const idx = item && typeof item === "object" ? (item as { index?: unknown }).index : undefined;
        if (typeof idx === "number" && idx >= 1 && idx <= total) set.add(Math.floor(idx));
      }
      return set; // explicit (incl. empty []) honored → [] drops all
    }
  } catch {
    // not JSON → keep all (resilient degradation)
  }
  return new Set(Array.from({ length: total }, (_, i) => i + 1));
}

/** Build the SYNTHESIZE prompt from the query + a bounded set of snippets. */
export function buildSynthesisPrompt(
  query: string,
  gathered: SearchResult[],
): string {
  const selected = selectForSynthesis(gathered, 8);
  const sources = selected
    .map((r, i) => {
      const title = r.title || r.url;
      // Prefer full extracted content (read mode); fall back to the snippet.
      const body = r.content && r.content.trim().length > 0 ? r.content : r.snippet;
      return `[${i + 1}] ${title}\nURL: ${r.url}\n${body}`;
    })
    .join("\n\n");
  return [
    "You are Prowl, a metasearch synthesizer for the litter web — the",
    "non-commercial, personal, archival corners of the open web.",
    "Synthesize the user's query from the result snippets below into a",
    "concise, neutral summary (3–6 short paragraphs). Prefer personal",
    "accounts, archives, and niche sources over SEO/commercial content.",
    "Cite sources inline as [n] matching the numbering. Do NOT append a",
    '"Sources:" list — the sources are rendered separately by the client.',
    "If no snippets are provided, say you found no relevant sources; do not",
    "answer from prior knowledge.",
    "",
    `Query: ${query}`,
    "",
    "Result snippets:",
    sources || "(none)",
  ].join("\n");
}

/**
 * SYNTHESIZE — call the model with the gathered snippets to produce a summary.
 */
export async function synthesize(
  model: ModelPort,
  query: string,
  gathered: SearchResult[],
): Promise<string> {
  return model.generate(buildSynthesisPrompt(query, gathered));
}

/** PRESENT — render the final content via the presenter port. */
export async function present(
  presenter: PresenterPort,
  result: PresenterResult,
): Promise<void> {
  await presenter.present(result);
}

/** Render the synthesized summary + source list into presentable markdown. */
export function formatSearchOutput(
  summary: string,
  sources: SearchResult[],
): string {
  const links = sources
    .map((r, i) => `${i + 1}. ${r.title || r.url} — ${r.url}`)
    .join("\n");
  return `${summary.trim()}\n\nSources:\n${links}`;
}
