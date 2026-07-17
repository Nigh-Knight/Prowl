// ranking.ts — snippet-level selection / dedup policy for the search pipeline.
//
// Pure, I/O-free: operates only on core data types. Owns the ranking and
// dedup policy (Perplexity dependency rule — orchestration/policy lives in
// core, never in adapters).

import type { SearchResult } from "./ports.ts";

/** Normalize a URL for dedup comparison (drop scheme, fragment, query, trailing slash). */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    const path = u.pathname.replace(/\/+$/, "");
    return (u.host + path).toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase();
  }
}

/** Host (domain) of a URL, used for diversity capping. */
function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/** Normalize whitespace in title / url / snippet / engine fields. */
export function normalizeResults(results: SearchResult[]): SearchResult[] {
  return results.map((r) => ({
    ...r,
    title: (r.title ?? "").trim(),
    url: (r.url ?? "").trim(),
    snippet: (r.snippet ?? "").trim(),
    engine: r.engine ? r.engine.trim() : r.engine,
  }));
}

/** Deduplicate results by normalized URL, keeping the first occurrence. (GATHER) */
export function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = normalizeUrl(r.url);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

// Engines that skew toward the litter web (PRD §2): favored in ranking.
const LITTER_ENGINES = new Set([
  "marginalia",
  "wiby",
  "mojeek",
  "searchmysite",
  "yacy",
]);

/** Heuristic signal score for a single result (higher = more likely useful). */
function scoreResult(r: SearchResult): number {
  let score = 0;
  if (r.snippet && r.snippet.length > 0) score += 2;
  if (r.title && r.title.length > 0) score += 1;
  const engine = (r.engine ?? "").toLowerCase();
  if (LITTER_ENGINES.has(engine)) score += 1;
  return score;
}

/**
 * Rank results by heuristic signal, deduplicated first. Stable ordering:
 * higher score wins; ties preserve input order. Used to order GATHER output
 * and to bound the SYNTHESIZE context.
 */
export function rankResults(results: SearchResult[]): SearchResult[] {
  const deduped = dedupeResults(results);
  const indexed = deduped.map((r, i) => ({ r, i }));
  indexed.sort((a, b) => {
    const diff = scoreResult(b.r) - scoreResult(a.r);
    if (diff !== 0) return diff > 0 ? 1 : -1;
    return a.i - b.i; // stable tie-break by original position
  });
  return indexed.map((x) => x.r);
}

/**
 * Select a bounded, deduplicated, ranked subset for the SYNTHESIZE context.
 * Caps the number of snippets fed to the model (v0.1 default 8) while
 * maximizing domain diversity (at most 2 results per host).
 */
export function selectForSynthesis(
  results: SearchResult[],
  limit = 8,
): SearchResult[] {
  const ranked = rankResults(results);
  const perHost = new Map<string, number>();
  const out: SearchResult[] = [];
  for (const r of ranked) {
    if (out.length >= limit) break;
    const host = hostOf(r.url);
    const seen = perHost.get(host) ?? 0;
    if (seen >= 2) continue; // cap per-domain for diversity
    perHost.set(host, seen + 1);
    out.push(r);
  }
  return out;
}
