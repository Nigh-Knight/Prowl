// pipeline.ts — primitive functions composing the core search pipeline.
//
// Each primitive is a single pipeline step. The `search` composer in
// commands.ts wires them into PLAN → SCATTER → GATHER → SYNTHESIZE → PRESENT.
// Core owns no I/O: every step receives its ports as arguments.

import type {
  ModelPort,
  PresenterPort,
  SearchPort,
  SearchResult,
} from "./ports.ts";
import { rankResults, selectForSynthesis } from "./ranking.ts";

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
    "Given the user's query, return a JSON array of 1 to 5 search",
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
      if (strings.length > 0) return strings.slice(0, 8);
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
  if (lines.length > 0) return lines.slice(0, 8);

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
  return rankResults(results);
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
      const snip = r.snippet || "(no snippet)";
      return `[${i + 1}] ${title}\nURL: ${r.url}\n${snip}`;
    })
    .join("\n\n");
  return [
    "You are Prowl, a metasearch synthesizer for the litter web — the",
    "non-commercial, personal, archival corners of the open web.",
    "Synthesize the user's query from the result snippets below into a",
    "concise, neutral summary (3–6 short paragraphs). Prefer personal",
    "accounts, archives, and niche sources over SEO/commercial content.",
    "Cite sources inline as [n] matching the numbering, and end with a",
    '"Sources:" list of the cited URLs.',
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
  content: string,
): Promise<void> {
  await presenter.present(content);
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
